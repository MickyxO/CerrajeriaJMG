const pool = require("../../config/db");
const { Venta, DetalleVenta } = require("../../models/venta/venta.model"); 
const CajaService = require("../caja/caja.service");

const BUSINESS_TZ = process.env.DB_TIMEZONE || process.env.APP_TIMEZONE || 'America/Mexico_City';

class VentaService {

    _isAnuladaVentaRow(row) {
        const estado = (row?.estado ?? "").toString().toUpperCase();
        if (estado === "ANULADA") return true;
        const notas = (row?.notas ?? "").toString();
        return notas.includes("[ANULADA]") || Number(row?.total ?? 0) === 0;
    }

    // =========================================================================
    // 0. HELPER: MAPEO DE BASE DE DATOS A MODELO
    // =========================================================================
    _mapRowToModel(row) {
        return new Venta(
            row.id_venta,
            row.fecha_venta,
            row.id_usuario,
            row.nombre_cliente,
            row.total,
            row.metodo_pago,
            row.notas,
            row.subtotal,
            row.monto_iva,
            row.estado ?? 'COMPLETADA'
        );
    }

    // =========================================================================
    // 1. CREAR VENTA (Con Cálculo de IVA y Seguridad de Montos)
    // =========================================================================
    async crearVenta(datosVenta, carrito) {
        // datosVenta: { idUsuario, metodoPago, nombreCliente, notas, requiereFactura (BOOLEAN) }
        // carrito: Array [{ id: 1, cantidad: 1, precio: 1600 }]
        
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); 

            const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

            let sumaSubtotal = 0;

            // Cálculo del IVA
            let montoIVA = 0;
            // Verificamos si el flag 'requiereFactura' viene en true
            if (datosVenta.requiereFactura === true) {
                sumaSubtotal = round2(datosVenta.total / 1.16);
                montoIVA = round2(datosVenta.total - sumaSubtotal);
            } else {
                sumaSubtotal = round2(datosVenta.total);
                montoIVA = 0;
            }

            // ---------------------------------------------------------
            // PASO A: ASEGURAR CAJA ABIERTA (Solo si es Efectivo)
            // ---------------------------------------------------------
            let idCajaActual = null;
            if (datosVenta.metodoPago === 'Efectivo') {
                const cajaActual = await CajaService.getOrCreateCajaAbierta(datosVenta.idUsuario);
                idCajaActual = cajaActual.IdCaja;
                await client.query("SELECT id_caja FROM caja WHERE id_caja = $1 FOR UPDATE", [idCajaActual]);
            }

            // ---------------------------------------------------------
            // PASO A.1: NOTAS 
            // ---------------------------------------------------------
            const notasOriginal = (datosVenta.notas ?? "").toString().trim();
            const partesNotas = [];

            // Agregamos nota automática si pide factura
            if (datosVenta.requiereFactura) {
                partesNotas.push("**REQUIERE FACTURA**");
            }

            // ---------------------------------------------------------
            // PASO B: INSERTAR CABECERA DE VENTA (Con Subtotal, IVA y Estado)
            // ---------------------------------------------------------
            const insertVentaQuery = `
                INSERT INTO ventas (fecha_venta, id_usuario, nombre_cliente, subtotal, monto_iva, total, metodo_pago, notas, estado)
                VALUES (timezone('UTC', now()), $1, $2, $3, $4, $5, $6, $7, 'COMPLETADA')
                RETURNING id_venta, fecha_venta, estado
            `;
            const resVenta = await client.query(insertVentaQuery, [
                datosVenta.idUsuario,
                datosVenta.nombreCliente || 'Mostrador',
                sumaSubtotal,    // $ Valor neto
                montoIVA,        // $ Impuesto
                round2(datosVenta.total),      // $ Total a pagar
                datosVenta.metodoPago,
                notasOriginal || null
            ]);
            
            const idVenta = resVenta.rows[0].id_venta;

            if (idCajaActual) {
                await client.query(
                    "UPDATE caja SET monto_actual = monto_actual + $1 WHERE id_caja = $2",
                    [round2(datosVenta.total), idCajaActual] 
                );
            }

            // ---------------------------------------------------------
            // PASO D: PROCESAR EL CARRITO (Items y Servicios)
            // ---------------------------------------------------------
            for (const elemento of carrito) {
                const subtotalItem = round2(elemento.cantidad * elemento.precio);

                // Snapshot del item
                const resItem = await client.query(
                    "SELECT nombre, es_servicio FROM items WHERE id_item = $1",
                    [elemento.id]
                );
                if (resItem.rows.length === 0) throw new Error(`Item ID ${elemento.id} no encontrado.`);
                
                const { nombre: nombreItemSnapshot, es_servicio: esServicio } = resItem.rows[0];

                const notaItem = String(elemento.nota || elemento.descripcion || "").trim();
                const nombreFinalSnapshot = notaItem
                    ? `${nombreItemSnapshot}: ${notaItem}`
                    : nombreItemSnapshot;

                partesNotas.push(`${elemento.cantidad}x ${nombreFinalSnapshot}`);
                
                // Insertar Detalle
                await client.query(
                    `INSERT INTO detalle_ventas (id_venta, id_item, cantidad, precio_unitario, subtotal, nombre_item_snapshot)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [idVenta, elemento.id, elemento.cantidad, elemento.precio, subtotalItem, nombreFinalSnapshot]
                );

                // Descontar Inventario
                if (!esServicio) {
                    await client.query(
                        "UPDATE items SET stock_actual = stock_actual - $1 WHERE id_item = $2",
                        [elemento.cantidad, elemento.id]
                    );
                    // Kardex
                    await client.query(
                        `INSERT INTO movimientos_inventario (id_item, tipo_movimiento, cantidad, id_usuario, comentario)
                         VALUES ($1, 'VENTA', $2, $3, 'Venta #' || $4)`,
                        [elemento.id, elemento.cantidad, datosVenta.idUsuario, idVenta]
                    );
                }
            }

            // Actualizar notas generadas
            const notasGeneradas = partesNotas.length > 0 ? partesNotas.join(", ") : "";
            const notasFinal = notasGeneradas
                ? (notasOriginal ? `${notasGeneradas} | ${notasOriginal}` : notasGeneradas)
                : (notasOriginal || "");

            if (notasFinal) {
                await client.query("UPDATE ventas SET notas = $1 WHERE id_venta = $2", [notasFinal, idVenta]);
            }

            await client.query('COMMIT');
            return idVenta;

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error creando venta: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // 2. OBTENER LISTA DE VENTAS (Read) - Actualizado para mostrar Subtotal e IVA
    // =========================================================================
    async getVentas(fechaInicio, fechaFin) {
        try {
            // Nota: fecha_venta se guarda como TIMESTAMP (sin TZ) en UTC.
            // Para filtros por día (hoy/rango), comparamos usando la zona horaria del negocio.
            let filtro = "WHERE DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) = timezone($1, now())::date";
            const params = [BUSINESS_TZ];

            if (fechaInicio && fechaFin) {
                filtro = "WHERE DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) BETWEEN $2::date AND $3::date";
                params.push(fechaInicio, fechaFin);
            }

            // Agregamos subtotal, monto_iva y estado a la consulta
            const query = `
                SELECT v.id_venta, v.fecha_venta, v.nombre_cliente, 
                       v.subtotal, v.monto_iva, v.total, 
                       v.metodo_pago, v.notas, v.estado,
                       u.nombre_completo as vendedor
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                ${filtro}
                ORDER BY v.fecha_venta DESC
            `;
            
            const res = await pool.query(query, params);
            return res.rows; 
        } catch (err) {
            console.error("Error obteniendo ventas: ", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 3. OBTENER DETALLE DE UNA VENTA (Read By Id)
    // =========================================================================
    async getDetalleVenta(idVenta) {
        try {
            // 1. Datos Generales (Ya trae subtotal/iva porque usamos v.*)
            const ventaQuery = `
                SELECT v.*, u.nombre_completo as vendedor 
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                WHERE v.id_venta = $1
            `;
            const resVenta = await pool.query(ventaQuery, [idVenta]);
            
            if (resVenta.rows.length === 0) return null;

            // 2. Lista de Productos
            const itemsQuery = `
                SELECT 
                    dv.cantidad,
                    dv.precio_unitario,
                    dv.subtotal,
                    COALESCE(dv.nombre_item_snapshot, i.nombre) as nombre_producto
                FROM detalle_ventas dv
                LEFT JOIN items i ON dv.id_item = i.id_item
                WHERE dv.id_venta = $1
            `;
            const resItems = await pool.query(itemsQuery, [idVenta]);

            const ventaModel = this._mapRowToModel(resVenta.rows[0]);
            
            return {
                ...ventaModel,
                Vendedor: resVenta.rows[0].vendedor,
                Items: resItems.rows
            };

        } catch (err) {
            console.error("Error obteniendo detalle venta: ", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 4. REPORTE DETALLADO DEL DÍA - Actualizado con Subtotal/IVA
    // =========================================================================
    async getVentasDetalladasDia() {
        try {
            const query = `
                SELECT 
                    v.id_venta, 
                    v.fecha_venta, 
                    v.nombre_cliente, 
                    v.subtotal,
                    v.monto_iva,
                    v.total, 
                    v.metodo_pago,
                    v.notas,
                    v.estado,
                    u.nombre_completo as vendedor,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'nombre_producto', COALESCE(dv.nombre_item_snapshot, i.nombre),
                                'cantidad', dv.cantidad,
                                'precio_unitario', dv.precio_unitario,
                                'subtotal', dv.subtotal
                            )
                        ) FILTER (WHERE dv.id_detalle IS NOT NULL), 
                        '[]'
                    ) as items
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                LEFT JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
                LEFT JOIN items i ON dv.id_item = i.id_item
                WHERE DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) = timezone($1, now())::date
                GROUP BY v.id_venta, u.nombre_completo
                ORDER BY v.fecha_venta DESC
            `;

            const res = await pool.query(query, [BUSINESS_TZ]);
            return res.rows;
            
        } catch (err) {
            console.error("Error obteniendo ventas detalladas: ", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 5. ACTUALIZAR VENTA (Update Metadatos)
    // =========================================================================
    async updateVenta(id, cuerpo) {
        const mapaCampos = {
            'NombreCliente': 'nombre_cliente',
            'Notas': 'notas'
        };

        const columnas = [];
        const valores = [];
        let contador = 1;

        for (const [campoFront, campoBD] of Object.entries(mapaCampos)) {
            if (cuerpo[campoFront] !== undefined) {
                columnas.push(`${campoBD} = $${contador}`);
                valores.push(cuerpo[campoFront]);
                contador++;
            }
        }

        if (columnas.length === 0) {
            throw new Error("No hay campos válidos para actualizar (Solo NombreCliente o Notas).");
        }

        valores.push(id);

        try {
            const query = `UPDATE ventas SET ${columnas.join(", ")} WHERE id_venta = $${contador} RETURNING *`;
            const { rowCount, rows } = await pool.query(query, valores);

            if (rowCount === 0) throw new Error("Venta no encontrada.");

            return this._mapRowToModel(rows[0]);

        } catch (err) {
            console.error("Error actualizando venta: ", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 6. ANULAR VENTA (Revertir inventario + caja, sin borrar histórico)
    // =========================================================================
    async anularVenta(idVenta, { idUsuario, motivo } = {}) {
        const id = Number(idVenta);
        if (!Number.isFinite(id) || id <= 0) throw new Error("ID de venta inválido.");

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const resVenta = await client.query(
                "SELECT id_venta, fecha_venta, total, subtotal, monto_iva, metodo_pago, notas, estado FROM ventas WHERE id_venta = $1 FOR UPDATE",
                [id]
            );
            if (resVenta.rows.length === 0) throw new Error("Venta no encontrada.");

            const venta = resVenta.rows[0];
            if (this._isAnuladaVentaRow(venta)) {
                await client.query('COMMIT');
                return { idVenta: id, yaAnulada: true };
            }

            // Regla práctica: solo anular ventas del día.
            const resDia = await client.query(
                "SELECT DATE(timezone($2, $1::timestamp AT TIME ZONE 'UTC')) = timezone($2, now())::date as es_hoy",
                [venta.fecha_venta, BUSINESS_TZ]
            );
            if (!resDia.rows[0]?.es_hoy) {
                throw new Error("Solo se pueden anular ventas del día.");
            }

            const total = Number(venta.total ?? 0);
            const metodoPago = (venta.metodo_pago ?? '').toString();

            // Si fue efectivo, se requiere caja abierta para revertir monto_actual.
            let idCajaActual = null;
            if (metodoPago === 'Efectivo') {
                const resCaja = await client.query(
                    "SELECT id_caja FROM caja WHERE estado = 'ABIERTA' ORDER BY fecha_apertura DESC, hora_apertura DESC LIMIT 1 FOR UPDATE"
                );
                if (resCaja.rows.length === 0) {
                    throw new Error("No hay caja abierta en el sistema. No se puede anular una venta en efectivo.");
                }
                idCajaActual = resCaja.rows[0].id_caja;
            }

            // 1) Revertir inventario (solo items físicos)
            // Sumamos cantidades por item vendido, excluyendo servicios.
            const stockUpdateQuery = `
                WITH sumas AS (
                    SELECT dv.id_item, SUM(dv.cantidad) AS qty
                    FROM detalle_ventas dv
                    WHERE dv.id_venta = $1
                    GROUP BY dv.id_item
                )
                UPDATE items i
                SET stock_actual = stock_actual + s.qty
                FROM sumas s
                WHERE i.id_item = s.id_item
                  AND COALESCE(i.es_servicio, FALSE) = FALSE
                RETURNING i.id_item, s.qty
            `;
            const resStock = await client.query(stockUpdateQuery, [id]);

            // Kardex por cada item revertido
            for (const r of resStock.rows) {
                await client.query(
                    `INSERT INTO movimientos_inventario (id_item, tipo_movimiento, cantidad, id_usuario, comentario)
                     VALUES ($1, 'ANULACION_VENTA', $2, $3, 'Anulación venta #' || $4)`,
                    [r.id_item, Number(r.qty), idUsuario ?? null, id]
                );
            }

            // 2) Revertir caja si fue efectivo
            if (idCajaActual && Number.isFinite(total) && total !== 0) {
                await client.query(
                    "UPDATE caja SET monto_actual = monto_actual - $1 WHERE id_caja = $2",
                    [total, idCajaActual]
                );
            }

            // 3) Marcar venta como anulada: estado = 'ANULADA', montos a 0 y agregamos nota.
            const motivoTxt = (motivo ?? '').toString().trim();
            const sello = `[ANULADA] ${new Date().toISOString()}${idUsuario ? ` por usuario ${idUsuario}` : ''}${motivoTxt ? ` · Motivo: ${motivoTxt}` : ''}`;
            const notasNueva = (venta.notas ?? "").toString();
            const notasFinal = notasNueva ? `${notasNueva}\n${sello}` : sello;

            await client.query(
                "UPDATE ventas SET estado = 'ANULADA', total = 0, subtotal = 0, monto_iva = 0, notas = $1 WHERE id_venta = $2",
                [notasFinal, id]
            );

            await client.query('COMMIT');
            return { idVenta: id, yaAnulada: false };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error anulando venta: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // 7. ELIMINAR VENTA
    // =========================================================================
    async deleteVenta(id) {
        try {
            const query = "DELETE FROM ventas WHERE id_venta = $1 RETURNING id_venta";
            const { rowCount } = await pool.query(query, [id]);

            if (rowCount === 0) throw new Error("Venta no encontrada.");

            return { message: "Venta eliminada correctamente. (Nota: El inventario no se restauró automáticamente)" };

        } catch (err) {
            console.error("Error eliminando venta: ", err.message);
            throw err;
        }
    }
}

module.exports = new VentaService();