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
            row.notas
        );
    }

    // =========================================================================
    // 1. CREAR VENTA (Transacción Completa - Lógica Intacta)
    // =========================================================================
    async crearVenta(datosVenta, carrito) {
        // datosVenta: { idUsuario, total, metodoPago, nombreCliente, notas }
        // carrito: Array [{ tipo: 'ITEM'|'COMBO', id: 1, cantidad: 1, precio: 1600 }]
        // Nota: 'precio' en el carrito debe ser el PRECIO UNITARIO final negociado.
        // EL TIPO ES UNA BANDERA QUE VIENE DEL FRONTEND PARA SABER CÓMO PROCESARLO.

        const client = await pool.connect();

        try {
            await client.query('BEGIN'); 

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
            // PASO A.1: NOTAS (Opción A)
            // Si el frontend NO manda notas, las construimos durante el PASO D
            // y luego actualizamos la venta (UPDATE) antes del COMMIT.
            // ---------------------------------------------------------
            const notasOriginal = (datosVenta.notas ?? "").toString().trim();
            const autoNotas = !notasOriginal;
            const partesNotas = [];

            // ---------------------------------------------------------
            // PASO B: INSERTAR CABECERA DE VENTA
            // ---------------------------------------------------------
            const insertVentaQuery = `
                INSERT INTO ventas (id_usuario, nombre_cliente, total, metodo_pago, notas)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id_venta, fecha_venta
            `;
            const resVenta = await client.query(insertVentaQuery, [
                datosVenta.idUsuario,
                datosVenta.nombreCliente || 'Mostrador',
                datosVenta.total,
                datosVenta.metodoPago,
                notasOriginal || null
            ]);
            
            const idVenta = resVenta.rows[0].id_venta;

            // ---------------------------------------------------------
            // PASO C: ACTUALIZAR DINERO EN CAJA (Si aplica)
            // ---------------------------------------------------------
            if (idCajaActual) {
                await client.query(
                    "UPDATE caja SET monto_actual = monto_actual + $1 WHERE id_caja = $2",
                    [datosVenta.total, idCajaActual]
                );
            }

            // ---------------------------------------------------------
            // PASO D: PROCESAR EL CARRITO (La Lógica Maestra)
            // ---------------------------------------------------------
            for (const elemento of carrito) {
                
                // === CASO 1: ITEM INDIVIDUAL (Producto o Servicio suelto) ===
                if (elemento.tipo === 'ITEM') {
                    const subtotal = elemento.cantidad * elemento.precio;

                    // Snapshot del item para que cambios posteriores no alteren el historial
                    const resItem = await client.query(
                        "SELECT nombre, es_servicio FROM items WHERE id_item = $1",
                        [elemento.id]
                    );
                    if (resItem.rows.length === 0) {
                        throw new Error(`Item no encontrado (ID ${elemento.id}).`);
                    }
                    const { nombre: nombreItemSnapshot, es_servicio: esServicio } = resItem.rows[0];

                    if (autoNotas) {
                        partesNotas.push(`${elemento.cantidad}x ${nombreItemSnapshot}`);
                    }
                    
                    // 1. Insertar Detalle
                    await client.query(
                        `INSERT INTO detalle_ventas (id_venta, id_item, cantidad, precio_unitario, subtotal, nombre_item_snapshot)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [idVenta, elemento.id, elemento.cantidad, elemento.precio, subtotal, nombreItemSnapshot]
                    );

                    // 2. Descontar Inventario (Si NO es servicio)
                    if (!esServicio) {
                        await client.query(
                            "UPDATE items SET stock_actual = stock_actual - $1 WHERE id_item = $2",
                            [elemento.cantidad, elemento.id]
                        );
                        // Kardex
                        await client.query(
                            `INSERT INTO movimientos_inventario (id_item, tipo_movimiento, cantidad, id_usuario, comentario)
                             VALUES ($1, 'VENTA', $2, $3, 'Venta Indiv. #' || $4)`,
                            [elemento.id, elemento.cantidad, datosVenta.idUsuario, idVenta]
                        );
                    }

                // === CASO 2: COMBO (Lógica "Hardware Intocable") ===
                } else if (elemento.tipo === 'COMBO') {

                    // Snapshot de cabecera del combo
                    const resCombo = await client.query(
                        "SELECT nombre_combo FROM combos WHERE id_combo = $1",
                        [elemento.id]
                    );
                    if (resCombo.rows.length === 0) {
                        throw new Error(`Combo no encontrado (ID ${elemento.id}).`);
                    }
                    const nombreComboSnapshot = resCombo.rows[0].nombre_combo;

                    if (autoNotas) {
                        partesNotas.push(`${elemento.cantidad}x ${nombreComboSnapshot}`);
                    }
                    
                    // 1. Obtener receta del combo
                    const resReceta = await client.query(
                        `SELECT ci.id_item, ci.cantidad_default, i.precio_venta, i.es_servicio, i.nombre
                         FROM combo_items ci
                         JOIN items i ON ci.id_item = i.id_item
                         WHERE ci.id_combo = $1`,
                        [elemento.id]
                    );
                    const ingredientes = resReceta.rows;

                    if (ingredientes.length > 0) {
                        // Separar Físicos vs Servicios
                        const itemsFisicos = ingredientes.filter(i => !i.es_servicio);
                        const itemsServicio = ingredientes.filter(i => i.es_servicio);

                        // Calcular costo total del Hardware (Precio Lista * Cantidad)
                        let costoHardwareUnitario = 0;
                        itemsFisicos.forEach(item => {
                            costoHardwareUnitario += (Number(item.precio_venta) * item.cantidad_default);
                        });

                        // Calcular remanente para Mano de Obra (PrecioCobrado - CostoHardware)
                        // elemento.precio es el precio UNITARIO del combo negociado
                        const remanenteUnitario = elemento.precio - costoHardwareUnitario;

                        // --- A) REGISTRAR ITEMS FÍSICOS (Precio Fijo) ---
                        for (const item of itemsFisicos) {
                            const cantidadTotal = item.cantidad_default * elemento.cantidad;
                            const precioLista = Number(item.precio_venta);
                            const subtotalFijo = precioLista * cantidadTotal;

                            // Insertar
                            await client.query(
                                `INSERT INTO detalle_ventas (
                                    id_venta, id_item, cantidad, precio_unitario, subtotal,
                                    nombre_item_snapshot,
                                    id_combo, nombre_combo_snapshot, precio_combo_unitario_snapshot, combo_cantidad_snapshot
                                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                                [
                                    idVenta, item.id_item, cantidadTotal, precioLista, subtotalFijo,
                                    item.nombre,
                                    elemento.id, nombreComboSnapshot, elemento.precio, elemento.cantidad
                                ]
                            );

                            // Inventario + Kardex
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

                        // --- B) REGISTRAR SERVICIOS (Absorben la Ganancia/Pérdida) ---
                        if (itemsServicio.length > 0) {
                            // Dividimos el remanente entre los servicios que tenga el combo (usualmente 1)
                            const precioServicioUnitario = remanenteUnitario / itemsServicio.length;

                            for (const srv of itemsServicio) {
                                const cantidadTotal = srv.cantidad_default * elemento.cantidad;
                                const subtotalVariable = precioServicioUnitario * cantidadTotal;

                                await client.query(
                                    `INSERT INTO detalle_ventas (
                                        id_venta, id_item, cantidad, precio_unitario, subtotal,
                                        nombre_item_snapshot,
                                        id_combo, nombre_combo_snapshot, precio_combo_unitario_snapshot, combo_cantidad_snapshot
                                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                                    [
                                        idVenta, srv.id_item, cantidadTotal, precioServicioUnitario, subtotalVariable,
                                        srv.nombre,
                                        elemento.id, nombreComboSnapshot, elemento.precio, elemento.cantidad
                                    ]
                                );
                            }
                        } else {
                            // FALLBACK DE SEGURIDAD:
                            if (remanenteUnitario !== 0 && itemsFisicos.length > 0) {
                                console.warn(`Advertencia: El combo ID ${elemento.id} no tiene servicio configurado para absorber la variacion de precio.`);
                            }
                        }
                    }
                }
            }

            // Guardar notas autogeneradas (si aplica)
            if (autoNotas) {
                const notasGeneradas = partesNotas.join(", ");
                await client.query(
                    "UPDATE ventas SET notas = $1 WHERE id_venta = $2",
                    [notasGeneradas, idVenta]
                );
            }

            await client.query('COMMIT'); // --- CONFIRMAR TODO ---
            return idVenta;

        } catch (err) {
            await client.query('ROLLBACK'); // --- DESHACER TODO SI FALLA ---
            console.error("Error creando venta: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // 2. OBTENER LISTA DE VENTAS (Read)
    // =========================================================================
    async getVentas(fechaInicio, fechaFin) {
        try {
            // Si no mandan fechas, traemos las del día actual por defecto
            let filtro = "WHERE DATE(v.fecha_venta) = CURRENT_DATE";
            const params = [];

            if (fechaInicio && fechaFin) {
                filtro = "WHERE DATE(v.fecha_venta) BETWEEN $1 AND $2";
                params.push(fechaInicio, fechaFin);
            }

            const query = `
                SELECT v.id_venta, v.fecha_venta, v.nombre_cliente, v.total, v.metodo_pago, v.notas,
                       u.nombre_completo as vendedor
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                ${filtro}
                ORDER BY v.fecha_venta DESC
            `;
            
            const res = await pool.query(query, params);
            
            // Retornamos tal cual para mantener tu vista intacta, 
            // aunque si quisieras ser estricto podrías usar mapRowToModel aquí.
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
            // 1. Datos Generales
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

            // Aquí mezclamos el Modelo de Venta con los items extra
            const ventaModel = this._mapRowToModel(resVenta.rows[0]);
            
            // Agregamos propiedades extra que no están en el modelo base pero son útiles para el frontend
            return {
                ...ventaModel,
                Vendedor: resVenta.rows[0].vendedor,
                Items: resItems.rows // Array de objetos simples
            };

        } catch (err) {
            console.error("Error obteniendo detalle venta: ", err.message);
            throw err;
        }
    }

    // En VentaService.js

    async getVentasDetalladasDia() {
        try {
            const query = `
                SELECT 
                    v.id_venta, 
                    v.fecha_venta, 
                    v.nombre_cliente, 
                    v.total, 
                    v.metodo_pago,
                    v.notas,
                    u.nombre_completo as vendedor,
                    -- Aquí ocurre la magia: Creamos un array de objetos JSON con los items
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
    // 4. ACTUALIZAR VENTA (Update)
    // =========================================================================
    // NOTA: Solo permitimos editar metadatos (Cliente, Notas) para no corromper 
    // inventario ni caja. Si hay error en montos, se debe cancelar y crear nueva.
    async updateVenta(id, cuerpo) {
        const mapaCampos = {
            'NombreCliente': 'nombre_cliente',
            'Notas': 'notas',
            // 'MetodoPago': 'metodo_pago' // Podrías descomentar si permites cambiar esto post-venta
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
    // 5. ELIMINAR VENTA (Delete)
    // =========================================================================
    // ADVERTENCIA: Esta función elimina el registro. Como tienes "ON DELETE CASCADE"
    // en detalle_ventas, se borrarán los detalles.
    // OJO: Esta versión simple NO devuelve el stock al inventario automáticamente.
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