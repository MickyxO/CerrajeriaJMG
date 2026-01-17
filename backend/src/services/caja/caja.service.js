const pool = require("../../config/db");
const { Caja, MovimientoCaja } = require("../../models/caja/caja.model.js");

class CajaService {

    // Helper para mapear Movimientos
    _mapMovimientoToModel(row) {
        return new MovimientoCaja(
            row.id_movimiento,
            row.id_caja,
            row.monto,
            row.metodo_pago,
            row.concepto,
            row.fecha_hora,
            row.id_usuario,
            row.tipo_movimiento
        );
    }



    async getCajaDelDia() {
        try {
            const query = `
                SELECT * FROM caja 
                WHERE estado = 'ABIERTA' 
                ORDER BY fecha_apertura DESC LIMIT 1
            `;
            const { rows } = await pool.query(query);
            
            if (rows.length === 0) return null;
            
            const r = rows[0];
            return new Caja(r.id_caja, r.fecha_apertura, r.hora_apertura, r.monto_inicial, r.monto_actual, r.estado, r.id_usuario_apertura);
        } catch (err) {
            console.error("Error consultando caja: ", err.message);
            throw err;
        }
    }

    async getCajaPorFecha(fecha) {
        try {
            const query = `
                SELECT * FROM caja
                WHERE fecha_apertura = $1::date
                ORDER BY hora_apertura DESC
                LIMIT 1
            `;
            const { rows } = await pool.query(query, [fecha]);
            if (rows.length === 0) return null;
            const r = rows[0];
            return new Caja(
                r.id_caja,
                r.fecha_apertura,
                r.hora_apertura,
                r.monto_inicial,
                r.monto_actual,
                r.estado,
                r.id_usuario_apertura
            );
        } catch (err) {
            console.error("Error consultando caja por fecha: ", err.message);
            throw err;
        }
    }

    async getFechasCaja(limit = 60) {
        try {
            const lim = Number.isFinite(Number(limit)) ? Number(limit) : 60;
            const query = `
                SELECT DISTINCT fecha_apertura
                FROM caja
                ORDER BY fecha_apertura DESC
                LIMIT $1
            `;
            const { rows } = await pool.query(query, [lim]);
            return rows.map((r) => r.fecha_apertura);
        } catch (err) {
            console.error("Error obteniendo fechas de caja: ", err.message);
            throw err;
        }
    }

    async abrirCaja(montoInicial, idUsuario) {
        if (montoInicial === undefined || montoInicial < 0) throw new Error("Monto inicial inválido.");

        try {
            const abierta = await this.getCajaDelDia();
            if (abierta) throw new Error("Ya existe una caja abierta. Debe cerrarla antes de abrir otra.");

            const query = `
                INSERT INTO caja (monto_inicial, monto_actual, id_usuario_apertura, estado)
                VALUES ($1, $1, $2, 'ABIERTA')
                RETURNING id_caja
            `;
            const { rows } = await pool.query(query, [montoInicial, idUsuario]);
            return rows[0].id_caja;

        } catch (err) {
            if (err.code === '23505') throw new Error("Ya se abrió una caja con la fecha de hoy.");
            console.error("Error abriendo caja: ", err.message);
            throw err;
        }
    }

    async cerrarCaja(idUsuario, montoFinalFisico) {
        try {
            const caja = await this.getCajaDelDia();
            if (!caja) throw new Error("No hay caja abierta para cerrar.");

            const query = `
                UPDATE caja 
                SET estado = 'CERRADA', 
                    hora_cierre = CURRENT_TIMESTAMP, 
                    monto_final = $1,
                    id_usuario_cierre = $2
                WHERE id_caja = $3
                RETURNING *
            `;
            const { rows } = await pool.query(query, [montoFinalFisico, idUsuario, caja.IdCaja]);
            return rows[0];

        } catch (err) {
            console.error("Error cerrando caja: ", err.message);
            throw err;
        }
    }


    async registrarGasto(datos) {

        const { Monto, Concepto, IdUsuario, MetodoPago } = datos;

        if (!Monto || Monto <= 0) throw new Error("El monto del gasto debe ser mayor a 0.");

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const queryCaja = "SELECT id_caja FROM caja WHERE estado = 'ABIERTA' LIMIT 1 FOR UPDATE";
            const resCaja = await client.query(queryCaja);
            
            if (resCaja.rows.length === 0) throw new Error("No hay caja abierta. Abra la caja antes de registrar gastos.");
            
            const idCaja = resCaja.rows[0].id_caja;

            // 1. Insertar el Gasto con el MetodoPago
            const queryMov = `
                INSERT INTO movimientos_caja (id_caja, monto, concepto, id_usuario, metodo_pago, tipo_movimiento)
                VALUES ($1, $2, $3, $4, $5, 'SALIDA')
                RETURNING id_movimiento
            `;
            const resMov = await client.query(queryMov, [idCaja, Monto, Concepto, IdUsuario, MetodoPago]);

            // 2. LÓGICA CRÍTICA: Solo restamos de la caja si fue en EFECTIVO
            if (MetodoPago === 'Efectivo') {
                const queryUpdate = `
                    UPDATE caja SET monto_actual = monto_actual - $1 WHERE id_caja = $2
                `;
                await client.query(queryUpdate, [Monto, idCaja]);
            } 


            await client.query('COMMIT');
            return resMov.rows[0].id_movimiento;

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error registrando gasto: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

async getMovimientosDelDia(fecha = null) {
        try {
            // Usamos UNION ALL para combinar Ventas (Entradas) y Movimientos (Salidas)
            // Normalizamos los nombres de las columnas (ej: total ahora se llama monto)
            // para que coincidan en el resultado final.
            const filtroFechaVentas = fecha ? "DATE(v.fecha_venta) = $1::date" : "DATE(v.fecha_venta) = CURRENT_DATE";
            const filtroFechaMovs = fecha ? "DATE(m.fecha_hora) = $1::date" : "DATE(m.fecha_hora) = CURRENT_DATE";

            const query = `
                SELECT * FROM (
                    (
                        SELECT 
                            v.id_venta as id_referencia,
                            v.total as monto,
                            v.metodo_pago,
                            v.notas as concepto, 
                            v.fecha_venta as fecha_hora,
                            'ENTRADA' as tipo_movimiento,
                            u.nombre_completo,
                            COALESCE(
                                json_agg(
                                    json_build_object(
                                        'nombre_producto', i.nombre,
                                        'cantidad', dv.cantidad,
                                        'precio_unitario', dv.precio_unitario,
                                        'subtotal', dv.subtotal
                                    )
                                ) FILTER (WHERE dv.id_detalle IS NOT NULL),
                                '[]'::json
                            ) as items
                        FROM ventas v
                        INNER JOIN usuarios u ON v.id_usuario = u.id_usuario
                        LEFT JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
                        LEFT JOIN items i ON dv.id_item = i.id_item
                        WHERE ${filtroFechaVentas}
                        GROUP BY v.id_venta, u.nombre_completo
                    )
                    UNION ALL
                    (
                        SELECT 
                            m.id_movimiento as id_referencia,
                            m.monto,
                            m.metodo_pago,
                            m.concepto,
                            m.fecha_hora,
                            m.tipo_movimiento,
                            u.nombre_completo,
                            '[]'::json as items
                        FROM movimientos_caja m
                        INNER JOIN usuarios u ON m.id_usuario = u.id_usuario
                        WHERE ${filtroFechaMovs}
                    )
                ) t
                ORDER BY t.fecha_hora ASC
            `;

            const params = fecha ? [fecha] : [];
            const { rows } = await pool.query(query, params);
            
            // Retornamos un objeto estandarizado para que el Frontend no batalle
            return rows.map(row => ({
                id: row.id_referencia,         // Puede ser ID de venta o de movimiento
                monto: parseFloat(row.monto),  // Aseguramos que sea número
                metodoPago: row.metodo_pago,
                concepto: row.concepto,
                fechaHora: row.fecha_hora,
                tipo: row.tipo_movimiento,     // 'ENTRADA' o 'SALIDA'
                usuario: row.nombre_completo,
                items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items ?? [])
            }));

        } catch (err) {
            console.error("Error obteniendo movimientos del día: ", err.message);
            throw err;
        }
    }

    // --- C. REPORTE DE CIERRE (Totales por método) ---
    async getResumenFinancieroDia(fecha = null) {
    try {

        // Importante: después de cerrar caja, ya no existe una caja 'ABIERTA'.
        // Para el resumen del día, tomamos la caja correspondiente a la fecha de hoy
        // (sea ABIERTA o CERRADA).
                const cajaHoyQuery = fecha
                        ? `
                                SELECT monto_inicial
                                FROM caja
                                WHERE fecha_apertura = $1::date
                                ORDER BY hora_apertura DESC
                                LIMIT 1
                            `
                        : `
                                SELECT monto_inicial
                                FROM caja
                                WHERE fecha_apertura = CURRENT_DATE
                                ORDER BY hora_apertura DESC
                                LIMIT 1
                            `;

                const resCajaHoy = fecha ? await pool.query(cajaHoyQuery, [fecha]) : await pool.query(cajaHoyQuery);
        const monto_inicial = resCajaHoy.rows.length > 0 ? Number(resCajaHoy.rows[0].monto_inicial) : 0;

        // 1. VENTAS POR METODO (Para gráficas o desglose)
                const ventasQuery = fecha
                        ? `
                                SELECT metodo_pago, SUM(total) as total_ventas
                                FROM ventas
                                WHERE DATE(fecha_venta) = $1::date
                                GROUP BY metodo_pago
                            `
                        : `
                                SELECT metodo_pago, SUM(total) as total_ventas
                                FROM ventas
                                WHERE DATE(fecha_venta) = CURRENT_DATE
                                GROUP BY metodo_pago
                            `;
        
        // 2. GASTOS POR METODO (Para gráficas o desglose)
                const gastosQuery = fecha
                        ? `
                                SELECT metodo_pago, SUM(monto) as total_gastos
                                FROM movimientos_caja
                                WHERE DATE(fecha_hora) = $1::date
                                GROUP BY metodo_pago
                            `
                        : `
                                SELECT metodo_pago, SUM(monto) as total_gastos
                                FROM movimientos_caja
                                WHERE DATE(fecha_hora) = CURRENT_DATE
                                GROUP BY metodo_pago
                            `;

        // 3. Totales del día (para calcular balance neto sin inconsistencias)
                const ventasTotalQuery = fecha
                        ? `
                                SELECT COALESCE(SUM(total), 0) as total_ventas
                                FROM ventas
                                WHERE DATE(fecha_venta) = $1::date
                            `
                        : `
                                SELECT COALESCE(SUM(total), 0) as total_ventas
                                FROM ventas
                                WHERE DATE(fecha_venta) = CURRENT_DATE
                            `;

                const gastosTotalQuery = fecha
                        ? `
                                SELECT COALESCE(SUM(monto), 0) as total_gastos
                                FROM movimientos_caja
                                WHERE DATE(fecha_hora) = $1::date
                            `
                        : `
                                SELECT COALESCE(SUM(monto), 0) as total_gastos
                                FROM movimientos_caja
                                WHERE DATE(fecha_hora) = CURRENT_DATE
                            `;

        // Ejecutamos consultas en paralelo
        const params = fecha ? [fecha] : [];
        const [resVentas, resGastos, resVentasTotal, resGastosTotal] = await Promise.all([
            pool.query(ventasQuery, params),
            pool.query(gastosQuery, params),
            pool.query(ventasTotalQuery, params),
            pool.query(gastosTotalQuery, params)
        ]);

        const totalVentas = Number(resVentasTotal.rows[0]?.total_ventas ?? 0);
        const totalGastos = Number(resGastosTotal.rows[0]?.total_gastos ?? 0);
        const balanceNeto = monto_inicial + totalVentas - totalGastos;

        // Estructuramos la respuesta
        return {
            monto_inicial: monto_inicial,
            ventas_desglose: resVentas.rows, 
            gastos_desglose: resGastos.rows,
            // Accedemos a la primera fila y a la columna balance_neto
            // Nota: PostgreSQL devuelve esto como string a veces, usamos Number() o parseFloat() por seguridad
            ganancia_dia: balanceNeto
        };

    } catch (err) {
        console.error("Error obteniendo resumen financiero: ", err.message);
        throw err;
    }
}
}

module.exports = new CajaService();