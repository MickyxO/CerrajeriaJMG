const pool = require("../../config/db");
const { Venta, DetalleVenta } = require("../../models/venta/venta.model"); 

class VentaService {

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
            // Agregamos los campos nuevos al modelo
            row.subtotal,
            row.monto_iva
        );
    }

    // =========================================================================
    // 1. CREAR VENTA (Con Cálculo de IVA y Seguridad de Montos)
    // =========================================================================
    async crearVenta(datosVenta, carrito) {
        // datosVenta: { idUsuario, metodoPago, nombreCliente, notas, requiereFactura (BOOLEAN) }
        // carrito: Array [{ tipo: 'ITEM'|'COMBO', id: 1, cantidad: 1, precio: 1600 }]
        
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
            // PASO A: VALIDAR CAJA (Solo si es Efectivo)
            // ---------------------------------------------------------
            let idCajaActual = null;
            if (datosVenta.metodoPago === 'Efectivo') {
                const resCaja = await client.query(
                    "SELECT id_caja FROM caja WHERE estado = 'ABIERTA' AND fecha_apertura = CURRENT_DATE LIMIT 1"
                );
                
                if (resCaja.rows.length === 0) {
                    throw new Error("No se puede cobrar en Efectivo: No hay caja abierta hoy.");
                }
                idCajaActual = resCaja.rows[0].id_caja;
            }

            // ---------------------------------------------------------
            // PASO A.1: NOTAS 
            // ---------------------------------------------------------
            const notasOriginal = (datosVenta.notas ?? "").toString().trim();
            const autoNotas = !notasOriginal;
            const partesNotas = [];

            // Agregamos nota automática si pide factura
            if (datosVenta.requiereFactura) {
                partesNotas.push("**REQUIERE FACTURA**");
            }

            // ---------------------------------------------------------
            // PASO B: INSERTAR CABECERA DE VENTA (Con Subtotal e IVA)
            // ---------------------------------------------------------
            const insertVentaQuery = `
                INSERT INTO ventas (id_usuario, nombre_cliente, subtotal, monto_iva, total, metodo_pago, notas)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id_venta, fecha_venta
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
            // PASO D: PROCESAR EL CARRITO (Items y Combos)
            // ---------------------------------------------------------
            for (const elemento of carrito) {
                
                // === CASO 1: ITEM INDIVIDUAL ===
                if (elemento.tipo === 'ITEM') {
                    const subtotalItem = round2(elemento.cantidad * elemento.precio);

                    // Snapshot del item
                    const resItem = await client.query(
                        "SELECT nombre, es_servicio FROM items WHERE id_item = $1",
                        [elemento.id]
                    );
                    if (resItem.rows.length === 0) throw new Error(`Item ID ${elemento.id} no encontrado.`);
                    
                    const { nombre: nombreItemSnapshot, es_servicio: esServicio } = resItem.rows[0];

                    if (autoNotas) partesNotas.push(`${elemento.cantidad}x ${nombreItemSnapshot}`);
                    
                    // Insertar Detalle
                    await client.query(
                        `INSERT INTO detalle_ventas (id_venta, id_item, cantidad, precio_unitario, subtotal, nombre_item_snapshot)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [idVenta, elemento.id, elemento.cantidad, elemento.precio, subtotalItem, nombreItemSnapshot]
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

                // === CASO 2: COMBO ===
                } else if (elemento.tipo === 'COMBO') {
                    // Snapshot Combo
                    const resCombo = await client.query("SELECT nombre_combo FROM combos WHERE id_combo = $1", [elemento.id]);
                    if (resCombo.rows.length === 0) throw new Error(`Combo ID ${elemento.id} no encontrado.`);
                    
                    const nombreComboSnapshot = resCombo.rows[0].nombre_combo;
                    if (autoNotas) partesNotas.push(`${elemento.cantidad}x ${nombreComboSnapshot}`);
                    
                    // Obtener receta
                    const resReceta = await client.query(
                        `SELECT ci.id_item, ci.cantidad_default, i.precio_venta, i.es_servicio, i.nombre
                         FROM combo_items ci
                         JOIN items i ON ci.id_item = i.id_item
                         WHERE ci.id_combo = $1`,
                        [elemento.id]
                    );
                    const ingredientes = resReceta.rows;

                    if (ingredientes.length > 0) {
                        const itemsFisicos = ingredientes.filter(i => !i.es_servicio);
                        const itemsServicio = ingredientes.filter(i => i.es_servicio);

                        let costoHardwareUnitario = 0;
                        itemsFisicos.forEach(item => {
                            costoHardwareUnitario += (Number(item.precio_venta) * item.cantidad_default);
                        });

                        const remanenteUnitario = elemento.precio - costoHardwareUnitario;

                        // A) REGISTRAR ITEMS FÍSICOS
                        for (const item of itemsFisicos) {
                            const cantidadTotal = item.cantidad_default * elemento.cantidad;
                            const precioLista = Number(item.precio_venta);
                            const subtotalFijo = round2(precioLista * cantidadTotal);

                            await client.query(
                                `INSERT INTO detalle_ventas (
                                    id_venta, id_item, cantidad, precio_unitario, subtotal,
                                    nombre_item_snapshot, id_combo, nombre_combo_snapshot, 
                                    precio_combo_unitario_snapshot, combo_cantidad_snapshot
                                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                                [
                                    idVenta, item.id_item, cantidadTotal, precioLista, subtotalFijo,
                                    item.nombre, elemento.id, nombreComboSnapshot, elemento.precio, elemento.cantidad
                                ]
                            );

                            await client.query(
                                "UPDATE items SET stock_actual = stock_actual - $1 WHERE id_item = $2",
                                [cantidadTotal, item.id_item]
                            );
                            await client.query(
                                `INSERT INTO movimientos_inventario (id_item, tipo_movimiento, cantidad, id_usuario, comentario)
                                 VALUES ($1, 'VENTA_COMBO', $2, $3, 'Venta Combo #' || $4)`,
                                [item.id_item, cantidadTotal, datosVenta.idUsuario, idVenta]
                            );
                        }

                        // B) REGISTRAR SERVICIOS
                        if (itemsServicio.length > 0) {
                            const precioServicioUnitario = remanenteUnitario / itemsServicio.length;
                            for (const srv of itemsServicio) {
                                const cantidadTotal = srv.cantidad_default * elemento.cantidad;
                                const subtotalVariable = round2(precioServicioUnitario * cantidadTotal);

                                await client.query(
                                    `INSERT INTO detalle_ventas (
                                        id_venta, id_item, cantidad, precio_unitario, subtotal,
                                        nombre_item_snapshot, id_combo, nombre_combo_snapshot, 
                                        precio_combo_unitario_snapshot, combo_cantidad_snapshot
                                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                                    [
                                        idVenta, srv.id_item, cantidadTotal, precioServicioUnitario, subtotalVariable,
                                        srv.nombre, elemento.id, nombreComboSnapshot, elemento.precio, elemento.cantidad
                                    ]
                                );
                            }
                        }
                    }
                }
            }

            // Actualizar notas generadas
            if (autoNotas && partesNotas.length > 0) {
                const notasGeneradas = partesNotas.join(", ");
                await client.query(
                    "UPDATE ventas SET notas = $1 WHERE id_venta = $2",
                    [notasGeneradas, idVenta]
                );
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
            let filtro = "WHERE DATE(v.fecha_venta) = CURRENT_DATE";
            const params = [];

            if (fechaInicio && fechaFin) {
                filtro = "WHERE DATE(v.fecha_venta) BETWEEN $1 AND $2";
                params.push(fechaInicio, fechaFin);
            }

            // Agregamos subtotal y monto_iva a la consulta
            const query = `
                SELECT v.id_venta, v.fecha_venta, v.nombre_cliente, 
                       v.subtotal, v.monto_iva, v.total, 
                       v.metodo_pago, v.notas,
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
                    COALESCE(dv.nombre_item_snapshot, i.nombre) as nombre_producto,
                    dv.id_combo,
                    dv.nombre_combo_snapshot,
                    dv.precio_combo_unitario_snapshot,
                    dv.combo_cantidad_snapshot
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
                    u.nombre_completo as vendedor,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'nombre_producto', COALESCE(dv.nombre_item_snapshot, i.nombre),
                                'cantidad', dv.cantidad,
                                'precio_unitario', dv.precio_unitario,
                                'subtotal', dv.subtotal,
                                'id_combo', dv.id_combo,
                                'nombre_combo', dv.nombre_combo_snapshot,
                                'precio_combo_unitario', dv.precio_combo_unitario_snapshot,
                                'combo_cantidad', dv.combo_cantidad_snapshot
                            )
                        ) FILTER (WHERE dv.id_detalle IS NOT NULL), 
                        '[]'
                    ) as items
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                LEFT JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
                LEFT JOIN items i ON dv.id_item = i.id_item
                WHERE DATE(v.fecha_venta) = CURRENT_DATE
                GROUP BY v.id_venta, u.nombre_completo
                ORDER BY v.fecha_venta DESC
            `;

            const res = await pool.query(query);
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
    // 6. ELIMINAR VENTA
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