const pool = require("../../config/db");
const { Caja, MovimientoCaja } = require("../../models/caja/caja.model.js");

const BUSINESS_TZ = process.env.DB_TIMEZONE || process.env.APP_TIMEZONE || 'America/Mexico_City';

function toIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const raw = String(value);
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

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

    async getBusinessNowInfo() {
        try {
            const query = `
                SELECT
                    timezone($1, now()) AS now_local,
                    timezone($1, now())::date AS fecha_local,
                    EXTRACT(HOUR FROM timezone($1, now()))::int AS hora_local,
                    EXTRACT(MINUTE FROM timezone($1, now()))::int AS minuto_local
            `;
            const { rows } = await pool.query(query, [BUSINESS_TZ]);
            const row = rows[0] || {};
            return {
                nowLocal: row.now_local || null,
                fechaLocal: toIsoDate(row.fecha_local),
                horaLocal: Number(row.hora_local ?? 0),
                minutoLocal: Number(row.minuto_local ?? 0),
            };
        } catch (err) {
            console.error("Error obteniendo hora local de negocio: ", err.message);
            throw err;
        }
    }

    async cerrarCajaAutomatica(idCaja, motivo = 'SCHEDULE_2359') {
        try {
            const query = `
                UPDATE caja
                SET estado = 'CERRADA',
                    hora_cierre = timezone('UTC', now()),
                    monto_final = COALESCE(monto_actual, monto_inicial),
                    id_usuario_cierre = NULL
                WHERE id_caja = $1
                  AND estado = 'ABIERTA'
                RETURNING id_caja, fecha_apertura, hora_apertura, hora_cierre, monto_inicial, monto_actual, monto_final
            `;
            const { rows } = await pool.query(query, [idCaja]);
            if (rows.length === 0) return null;
            return {
                ...rows[0],
                motivo,
            };
        } catch (err) {
            console.error("Error cerrando caja automáticamente: ", err.message);
            throw err;
        }
    }

    async autoCloseOpenCajaIfNeeded() {
        const cajaAbierta = await this.getCajaAbierta();
        if (!cajaAbierta) return { closed: false };

        const biz = await this.getBusinessNowInfo();
        const fechaApertura = toIsoDate(cajaAbierta?.FechaApertura);
        const fechaLocal = biz?.fechaLocal;

        if (!fechaApertura || !fechaLocal) return { closed: false };

        const esCajaDeDiaPrevio = fechaApertura < fechaLocal;
        const esMomentoProgramado =
            fechaApertura === fechaLocal && biz.horaLocal === 23 && biz.minutoLocal >= 59;

        if (!esCajaDeDiaPrevio && !esMomentoProgramado) {
            return { closed: false };
        }

        const motivo = esCajaDeDiaPrevio ? 'STALE_PREVIOUS_DAY' : 'SCHEDULE_2359';
        const cierre = await this.cerrarCajaAutomatica(cajaAbierta.IdCaja, motivo);
        return {
            closed: Boolean(cierre),
            motivo,
            cierre,
        };
    }

    async getUltimoCierreAutomaticoReciente(hoursWindow = 48) {
        try {
            const query = `
                SELECT id_caja, fecha_apertura, hora_apertura, hora_cierre, monto_final
                FROM caja
                WHERE estado = 'CERRADA'
                  AND id_usuario_cierre IS NULL
                  AND hora_cierre IS NOT NULL
                  AND timezone($1, hora_cierre AT TIME ZONE 'UTC') >= timezone($1, now()) - make_interval(hours => $2::int)
                ORDER BY hora_cierre DESC
                LIMIT 1
            `;
            const { rows } = await pool.query(query, [BUSINESS_TZ, Number(hoursWindow) || 48]);
            if (rows.length === 0) return null;
            const r = rows[0];
            return {
                idCaja: r.id_caja,
                fechaApertura: r.fecha_apertura,
                horaApertura: r.hora_apertura,
                horaCierre: r.hora_cierre,
                montoFinal: r.monto_final,
            };
        } catch (err) {
            console.error("Error consultando último cierre automático: ", err.message);
            throw err;
        }
    }

    // Caja ABIERTA (cualquier fecha). Útil para cerrar una caja vieja que quedó abierta.
    async getCajaAbierta() {
        try {
            const query = `
                SELECT c.*,
                    COALESCE((
                        SELECT SUM(v.total)
                        FROM ventas v
                        WHERE DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND v.metodo_pago = 'Efectivo'
                          AND v.estado = 'COMPLETADA'
                    ), 0) as ventas_efectivo_dia,
                    COALESCE((
                        SELECT SUM(m.monto)
                        FROM movimientos_caja m
                        WHERE DATE(timezone($1, m.fecha_hora AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND m.metodo_pago = 'Efectivo'
                          AND COALESCE(m.tipo_movimiento, 'SALIDA') = 'SALIDA'
                    ), 0) as gastos_efectivo_dia
                FROM caja c 
                WHERE c.estado = 'ABIERTA' 
                ORDER BY c.fecha_apertura DESC, c.hora_apertura DESC
                LIMIT 1
            `;
            const { rows } = await pool.query(query, [BUSINESS_TZ]);
            
            if (rows.length === 0) return null;
            
            const r = rows[0];
            const montoCalculado = Number(r.monto_inicial || 0) + Number(r.ventas_efectivo_dia || 0) - Number(r.gastos_efectivo_dia || 0);

            // Mantener sincronizada la columna monto_actual en la base de datos
            if (Number(r.monto_actual ?? 0) !== montoCalculado) {
                pool.query("UPDATE caja SET monto_actual = $1 WHERE id_caja = $2", [montoCalculado, r.id_caja]).catch(() => {});
            }

            return new Caja(r.id_caja, r.fecha_apertura, r.hora_apertura, r.monto_inicial, montoCalculado, r.estado, r.id_usuario_apertura);
        } catch (err) {
            console.error("Error consultando caja: ", err.message);
            throw err;
        }
    }

    // Obtiene la caja abierta actual o crea una automáticamente (silenciosa / just-in-time)
    async getOrCreateCajaAbierta(idUsuario = null, montoInicialDefault = 0) {
        // 1. Cerrar caja anterior si quedó abierta de un día previo
        await this.autoCloseOpenCajaIfNeeded();

        // 2. Si ya hay una caja abierta, la devolvemos de inmediato
        let caja = await this.getCajaAbierta();
        if (caja) {
            return caja;
        }

        // 3. Si no hay caja abierta, la abrimos automáticamente para hoy
        let userId = idUsuario;
        if (!userId) {
            const uRes = await pool.query("SELECT id_usuario FROM usuarios WHERE activo = true ORDER BY id_usuario ASC LIMIT 1");
            userId = uRes.rows[0]?.id_usuario || null;
        }

        try {
            const query = `
                INSERT INTO caja (fecha_apertura, hora_apertura, monto_inicial, monto_actual, id_usuario_apertura, estado)
                VALUES (timezone($3, now())::date, timezone('UTC', now()), $1, $1, $2, 'ABIERTA')
                RETURNING id_caja, fecha_apertura, hora_apertura, monto_inicial, monto_actual, estado, id_usuario_apertura
            `;
            const { rows } = await pool.query(query, [montoInicialDefault, userId, BUSINESS_TZ]);
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
            // Si hubo concurrencia y otra petición la abrió en el mismo instante
            if (err.code === '23505') {
                const cajaExistente = await this.getCajaAbierta();
                if (cajaExistente) return cajaExistente;
            }
            console.error("Error en getOrCreateCajaAbierta: ", err.message);
            throw err;
        }
    }

    // Consulta el estado de caja para el día de hoy, con auto-apertura si es un nuevo día
    async getEstadoCajaConAutoApertura(idUsuario = null) {
        await this.autoCloseOpenCajaIfNeeded();

        let cajaAbierta = await this.getCajaAbierta();

        // Si no hay caja abierta actualmente, la auto-abrimos de inmediato para hoy
        if (!cajaAbierta) {
            cajaAbierta = await this.getOrCreateCajaAbierta(idUsuario, 0);
        }

        const [bizNow, ultimoCierreAuto] = await Promise.all([
            this.getBusinessNowInfo(),
            this.getUltimoCierreAutomaticoReciente(),
        ]);

        return {
            cajaAbierta,
            bizNow,
            ultimoCierreAuto
        };
    }

    // Caja ABIERTA de HOY.
    async getCajaDelDia() {
        try {
            const query = `
                SELECT c.*,
                    COALESCE((
                        SELECT SUM(v.total)
                        FROM ventas v
                        WHERE DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND v.metodo_pago = 'Efectivo'
                          AND v.estado = 'COMPLETADA'
                    ), 0) as ventas_efectivo_dia,
                    COALESCE((
                        SELECT SUM(m.monto)
                        FROM movimientos_caja m
                        WHERE DATE(timezone($1, m.fecha_hora AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND m.metodo_pago = 'Efectivo'
                          AND COALESCE(m.tipo_movimiento, 'SALIDA') = 'SALIDA'
                    ), 0) as gastos_efectivo_dia
                FROM caja c
                WHERE c.estado = 'ABIERTA'
                  AND c.fecha_apertura = timezone($1, now())::date
                ORDER BY c.hora_apertura DESC
                LIMIT 1
            `;
            const { rows } = await pool.query(query, [BUSINESS_TZ]);

            if (rows.length === 0) return null;

            const r = rows[0];
            const montoCalculado = Number(r.monto_inicial || 0) + Number(r.ventas_efectivo_dia || 0) - Number(r.gastos_efectivo_dia || 0);

            if (Number(r.monto_actual ?? 0) !== montoCalculado) {
                pool.query("UPDATE caja SET monto_actual = $1 WHERE id_caja = $2", [montoCalculado, r.id_caja]).catch(() => {});
            }

            return new Caja(
                r.id_caja,
                r.fecha_apertura,
                r.hora_apertura,
                r.monto_inicial,
                montoCalculado,
                r.estado,
                r.id_usuario_apertura
            );
        } catch (err) {
            console.error("Error consultando caja del día: ", err.message);
            throw err;
        }
    }

    async getCajaPorFecha(fecha) {
        try {
            const query = `
                SELECT c.*,
                    COALESCE((
                        SELECT SUM(v.total)
                        FROM ventas v
                        WHERE DATE(timezone($2, v.fecha_venta AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND v.metodo_pago = 'Efectivo'
                          AND v.estado = 'COMPLETADA'
                    ), 0) as ventas_efectivo_dia,
                    COALESCE((
                        SELECT SUM(m.monto)
                        FROM movimientos_caja m
                        WHERE DATE(timezone($2, m.fecha_hora AT TIME ZONE 'UTC')) = c.fecha_apertura
                          AND m.metodo_pago = 'Efectivo'
                          AND COALESCE(m.tipo_movimiento, 'SALIDA') = 'SALIDA'
                    ), 0) as gastos_efectivo_dia
                FROM caja c
                WHERE c.fecha_apertura = $1::date
                ORDER BY c.hora_apertura DESC
                LIMIT 1
            `;
            const { rows } = await pool.query(query, [fecha, BUSINESS_TZ]);
            if (rows.length === 0) return null;
            const r = rows[0];

            let montoCalculado = Number(r.monto_actual ?? 0);
            if (r.estado === 'ABIERTA') {
                montoCalculado = Number(r.monto_inicial || 0) + Number(r.ventas_efectivo_dia || 0) - Number(r.gastos_efectivo_dia || 0);
            } else if (r.monto_final !== null && r.monto_final !== undefined) {
                montoCalculado = Number(r.monto_final);
            }

            return new Caja(
                r.id_caja,
                r.fecha_apertura,
                r.hora_apertura,
                r.monto_inicial,
                montoCalculado,
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
            // Si una caja vieja quedó abierta, se intenta cerrar automáticamente.
            await this.autoCloseOpenCajaIfNeeded();

            const abierta = await this.getCajaAbierta();
            if (abierta) throw new Error("Ya existe una caja abierta. Debe cerrarla antes de abrir otra.");

            const query = `
                INSERT INTO caja (fecha_apertura, hora_apertura, monto_inicial, monto_actual, id_usuario_apertura, estado)
                VALUES (timezone($3, now())::date, timezone('UTC', now()), $1, $1, $2, 'ABIERTA')
                RETURNING id_caja
            `;
            const { rows } = await pool.query(query, [montoInicial, idUsuario, BUSINESS_TZ]);
            return rows[0].id_caja;

        } catch (err) {
            if (err.code === '23505') throw new Error("Ya existe una caja abierta en el sistema. Debe cerrarla antes de abrir una nueva.");
            console.error("Error abriendo caja: ", err.message);
            throw err;
        }
    }

    async cerrarCaja(idUsuario, montoFinalFisico) {
        try {
            const caja = await this.getCajaAbierta();
            if (!caja) throw new Error("No hay caja abierta para cerrar.");

            const query = `
                UPDATE caja 
                SET estado = 'CERRADA', 
                    hora_cierre = timezone('UTC', now()), 
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

    async actualizarMontoInicialCaja(montoInicial, idUsuario) {
        const nuevoMontoInicial = Number(montoInicial);
        if (!Number.isFinite(nuevoMontoInicial) || nuevoMontoInicial < 0) {
            throw new Error("Monto inicial inválido.");
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const resCaja = await client.query(
                `
                    SELECT id_caja, monto_inicial, monto_actual
                    FROM caja
                    WHERE estado = 'ABIERTA'
                    ORDER BY fecha_apertura DESC, hora_apertura DESC
                    LIMIT 1
                    FOR UPDATE
                `
            );

            if (resCaja.rows.length === 0) {
                // Si no hay caja abierta, la creamos directamente con este monto inicial
                let userId = idUsuario;
                if (!userId) {
                    const uRes = await client.query("SELECT id_usuario FROM usuarios WHERE activo = true ORDER BY id_usuario ASC LIMIT 1");
                    userId = uRes.rows[0]?.id_usuario || null;
                }
                const query = `
                    INSERT INTO caja (fecha_apertura, hora_apertura, monto_inicial, monto_actual, id_usuario_apertura, estado)
                    VALUES (timezone($3, now())::date, timezone('UTC', now()), $1, $1, $2, 'ABIERTA')
                    RETURNING *, 0::numeric as diferencia_aplicada
                `;
                const { rows } = await client.query(query, [nuevoMontoInicial, userId, BUSINESS_TZ]);
                await client.query('COMMIT');
                return rows[0];
            }

            const caja = resCaja.rows[0];
            const montoInicialActual = Number(caja.monto_inicial ?? 0);
            const montoActualCaja = Number(caja.monto_actual ?? 0);
            const diferencia = nuevoMontoInicial - montoInicialActual;
            const nuevoMontoActual = montoActualCaja + diferencia;

            if (nuevoMontoActual < 0) {
                throw new Error("El ajuste deja el efectivo en caja por debajo de 0.");
            }

            const resUpdate = await client.query(
                `
                    UPDATE caja
                    SET monto_inicial = $1,
                        monto_actual = $2,
                        id_usuario_apertura = COALESCE($3, id_usuario_apertura)
                    WHERE id_caja = $4
                    RETURNING *
                `,
                [nuevoMontoInicial, nuevoMontoActual, idUsuario ?? null, caja.id_caja]
            );

            await client.query('COMMIT');

            return {
                ...resUpdate.rows[0],
                diferencia_aplicada: diferencia,
            };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error actualizando monto inicial de caja: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }


    async registrarGasto(datos) {

        const { Monto, Concepto, IdUsuario, MetodoPago } = datos;

        if (!Monto || Monto <= 0) throw new Error("El monto del gasto debe ser mayor a 0.");

        // Aseguramos que exista una caja abierta (se auto-abre silenciosamente si no hay)
        const cajaActual = await this.getOrCreateCajaAbierta(IdUsuario);
        const idCaja = cajaActual.IdCaja;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Bloqueamos la fila de la caja
            await client.query("SELECT id_caja FROM caja WHERE id_caja = $1 FOR UPDATE", [idCaja]);

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

    async registrarPrestamoCambio(datos) {
        const { Monto, Tipo = 'ENTRADA', Trabajador, IdUsuario, Nota } = datos || {};

        const numMonto = Number(Monto);
        if (!Number.isFinite(numMonto) || numMonto <= 0) {
            throw new Error("El monto del préstamo/cambio debe ser mayor a 0.");
        }

        const tipoMov = Tipo === 'SALIDA' ? 'SALIDA' : 'ENTRADA';
        const trabajadorNombre = (Trabajador || 'Trabajador').toString().trim();
        const notaTxt = (Nota || '').toString().trim();

        const concepto = tipoMov === 'ENTRADA'
            ? `Préstamo cambio - ${trabajadorNombre}${notaTxt ? ` (${notaTxt})` : ''}`
            : `Devolución préstamo cambio - ${trabajadorNombre}${notaTxt ? ` (${notaTxt})` : ''}`;

        // Aseguramos que exista una caja abierta (se auto-abre silenciosamente si no hay)
        const cajaActual = await this.getOrCreateCajaAbierta(IdUsuario);
        const idCaja = cajaActual.IdCaja;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Bloqueamos la fila de la caja
            await client.query("SELECT id_caja FROM caja WHERE id_caja = $1 FOR UPDATE", [idCaja]);

            // 1. Insertar el movimiento en efectivo
            const queryMov = `
                INSERT INTO movimientos_caja (id_caja, monto, concepto, id_usuario, metodo_pago, tipo_movimiento)
                VALUES ($1, $2, $3, $4, 'Efectivo', $5)
                RETURNING id_movimiento
            `;
            const resMov = await client.query(queryMov, [idCaja, numMonto, concepto, IdUsuario, tipoMov]);

            // 2. Actualizar monto_actual en caja (+ si entró dinero a la gaveta, - si se devolvió al trabajador)
            if (tipoMov === 'ENTRADA') {
                await client.query("UPDATE caja SET monto_actual = monto_actual + $1 WHERE id_caja = $2", [numMonto, idCaja]);
            } else {
                await client.query("UPDATE caja SET monto_actual = monto_actual - $1 WHERE id_caja = $2", [numMonto, idCaja]);
            }

            await client.query('COMMIT');
            return {
                id_movimiento: resMov.rows[0].id_movimiento,
                tipo_movimiento: tipoMov,
                monto: numMonto,
                concepto,
            };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error registrando préstamo/devolución de cambio: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    async actualizarGasto(idMovimiento, datos) {
        const id = Number(idMovimiento);
        if (!Number.isFinite(id) || id <= 0) throw new Error("ID de movimiento inválido.");

        const { Monto, Concepto, MetodoPago, IdUsuario } = datos || {};

        // Reglas: permitimos actualizar concepto siempre; monto/metodo opcional.
        if (Monto !== undefined && Number(Monto) <= 0) {
            throw new Error("El monto debe ser mayor a 0.");
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Bloqueamos la caja abierta (si existe) para no desbalancear en concurrente.
            // También sirve como regla: no editar movimientos si no hay caja abierta.
            const resCaja = await client.query(
                "SELECT id_caja FROM caja WHERE estado = 'ABIERTA' AND fecha_apertura = timezone($1, now())::date LIMIT 1 FOR UPDATE",
                [BUSINESS_TZ]
            );
            if (resCaja.rows.length === 0) {
                throw new Error("No hay caja abierta hoy. No se permite editar gastos con caja cerrada.");
            }
            const idCajaHoy = resCaja.rows[0].id_caja;

            // Leemos el movimiento actual y lo bloqueamos.
            const resMov = await client.query(
                "SELECT id_movimiento, id_caja, monto, metodo_pago, concepto FROM movimientos_caja WHERE id_movimiento = $1 FOR UPDATE",
                [id]
            );
            if (resMov.rows.length === 0) throw new Error("Movimiento no encontrado.");

            const mov = resMov.rows[0];
            if (Number(mov.id_caja) !== Number(idCajaHoy)) {
                throw new Error("Solo se pueden editar gastos del día (caja actual).");
            }

            const concepto = (mov.concepto ?? '').toString();
            const yaAnulado = concepto.includes('[ANULADO]') || Number(mov.monto ?? 0) === 0;
            if (yaAnulado) {
                throw new Error("No se puede editar un gasto anulado.");
            }

            const oldMonto = Number(mov.monto);
            const oldMetodo = (mov.metodo_pago ?? '').toString();

            const newMonto = Monto !== undefined ? Number(Monto) : oldMonto;
            const newMetodo = MetodoPago !== undefined ? (MetodoPago ?? '').toString() : oldMetodo;
            const newConcepto = Concepto !== undefined ? (Concepto ?? '').toString() : mov.concepto;

            if (!newConcepto || !newConcepto.trim()) {
                throw new Error("El concepto es requerido.");
            }

            // Ajuste de caja SOLO cuando cambia monto y/o metodo.
            // Recordatorio: al registrar gasto, si fue Efectivo se restó monto_actual.
            // Entonces al actualizar:
            // - si antes era Efectivo: devolvemos oldMonto
            // - si ahora es Efectivo: restamos newMonto
            let cajaDelta = 0;
            if (oldMetodo === 'Efectivo') cajaDelta += oldMonto;
            if (newMetodo === 'Efectivo') cajaDelta -= newMonto;

            const updateMovQuery = `
                UPDATE movimientos_caja
                SET monto = $1,
                    metodo_pago = $2,
                    concepto = $3,
                    id_usuario = COALESCE($4, id_usuario)
                WHERE id_movimiento = $5
                RETURNING *
            `;

            const resUpdate = await client.query(updateMovQuery, [newMonto, newMetodo, newConcepto, IdUsuario, id]);

            if (cajaDelta !== 0) {
                await client.query(
                    "UPDATE caja SET monto_actual = monto_actual + $1 WHERE id_caja = $2",
                    [cajaDelta, idCajaHoy]
                );
            }

            await client.query('COMMIT');
            return resUpdate.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error actualizando gasto: ", err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    async anularGasto(idMovimiento, { IdUsuario, Motivo, idUsuario, motivo } = {}) {
        const id = Number(idMovimiento);
        if (!Number.isFinite(id) || id <= 0) throw new Error("ID de movimiento inválido.");

        const userId = idUsuario ?? IdUsuario ?? null;
        const motivoTxt = (motivo ?? Motivo ?? '').toString().trim();

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Solo anulamos gastos del día con caja ABIERTA (no tocar cierres históricos)
            const resCaja = await client.query(
                "SELECT id_caja FROM caja WHERE estado = 'ABIERTA' AND fecha_apertura = timezone($1, now())::date LIMIT 1 FOR UPDATE",
                [BUSINESS_TZ]
            );
            if (resCaja.rows.length === 0) {
                throw new Error("No hay caja abierta hoy. No se permite anular gastos con caja cerrada.");
            }
            const idCajaHoy = resCaja.rows[0].id_caja;

            const resMov = await client.query(
                "SELECT id_movimiento, id_caja, monto, metodo_pago, concepto FROM movimientos_caja WHERE id_movimiento = $1 FOR UPDATE",
                [id]
            );
            if (resMov.rows.length === 0) throw new Error("Movimiento no encontrado.");

            const mov = resMov.rows[0];
            if (Number(mov.id_caja) !== Number(idCajaHoy)) {
                throw new Error("Solo se pueden anular gastos del día (caja actual).");
            }

            const concepto = (mov.concepto ?? '').toString();
            const yaAnulado = concepto.includes('[ANULADO]') || Number(mov.monto ?? 0) === 0;
            if (yaAnulado) {
                await client.query('COMMIT');
                return { idMovimiento: id, yaAnulado: true };
            }

            const oldMonto = Number(mov.monto ?? 0);
            const oldMetodo = (mov.metodo_pago ?? '').toString();

            // Al crear gasto: si fue Efectivo, se restó monto_actual.
            // Al anular: devolvemos ese monto.
            if (oldMetodo === 'Efectivo' && Number.isFinite(oldMonto) && oldMonto !== 0) {
                await client.query(
                    "UPDATE caja SET monto_actual = monto_actual + $1 WHERE id_caja = $2",
                    [oldMonto, idCajaHoy]
                );
            }

            const sello = `[ANULADO] ${new Date().toISOString()}${userId ? ` por usuario ${userId}` : ''}${motivoTxt ? ` · Motivo: ${motivoTxt}` : ''}`;
            const conceptoFinal = concepto ? `${concepto}\n${sello}` : sello;

            await client.query(
                "UPDATE movimientos_caja SET monto = 0, concepto = $1, id_usuario = COALESCE($2, id_usuario) WHERE id_movimiento = $3",
                [conceptoFinal, userId, id]
            );

            await client.query('COMMIT');
            return { idMovimiento: id, yaAnulado: false };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error anulando gasto: ", err.message);
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
            // Nota: timestamps se guardan como TIMESTAMP (sin TZ) en UTC.
            // Para filtrar por día, convertimos a la TZ del negocio.
            const filtroFechaVentas = fecha
                ? "DATE(timezone($2, v.fecha_venta AT TIME ZONE 'UTC')) = $1::date"
                : "DATE(timezone($1, v.fecha_venta AT TIME ZONE 'UTC')) = timezone($1, now())::date";
            const filtroFechaMovs = fecha
                ? "DATE(timezone($2, m.fecha_hora AT TIME ZONE 'UTC')) = $1::date"
                : "DATE(timezone($1, m.fecha_hora AT TIME ZONE 'UTC')) = timezone($1, now())::date";

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
                            'VENTA' as origen,
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
                        WHERE ${filtroFechaVentas} AND v.estado = 'COMPLETADA'
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
                            'MOVIMIENTO_CAJA' as origen,
                            u.nombre_completo,
                            '[]'::json as items
                        FROM movimientos_caja m
                        INNER JOIN usuarios u ON m.id_usuario = u.id_usuario
                        WHERE ${filtroFechaMovs}
                    )
                ) t
                ORDER BY t.fecha_hora ASC
            `;

            const params = fecha ? [fecha, BUSINESS_TZ] : [BUSINESS_TZ];
            const { rows } = await pool.query(query, params);
            
            // Retornamos un objeto estandarizado para que el Frontend no batalle
            return rows.map(row => ({
                id: row.id_referencia,         // Puede ser ID de venta o de movimiento
                monto: parseFloat(row.monto),  // Aseguramos que sea número
                metodoPago: row.metodo_pago,
                concepto: row.concepto,
                fechaHora: row.fecha_hora,
                tipo: row.tipo_movimiento,     // 'ENTRADA' o 'SALIDA'
                origen: row.origen,            // 'VENTA' o 'MOVIMIENTO_CAJA'
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
                                WHERE fecha_apertura = timezone($1, now())::date
                                ORDER BY hora_apertura DESC
                                LIMIT 1
                            `;

                const resCajaHoy = fecha ? await pool.query(cajaHoyQuery, [fecha]) : await pool.query(cajaHoyQuery, [BUSINESS_TZ]);
        const monto_inicial = resCajaHoy.rows.length > 0 ? Number(resCajaHoy.rows[0].monto_inicial) : 0;

        // 1. VENTAS POR METODO (Para gráficas o desglose)
                const ventasQuery = fecha
                        ? `
                                SELECT metodo_pago, SUM(total) as total_ventas
                                FROM ventas
                                WHERE DATE(timezone($2, fecha_venta AT TIME ZONE 'UTC')) = $1::date
                                  AND estado = 'COMPLETADA'
                                GROUP BY metodo_pago
                            `
                        : `
                                SELECT metodo_pago, SUM(total) as total_ventas
                                FROM ventas
                                WHERE DATE(timezone($1, fecha_venta AT TIME ZONE 'UTC')) = timezone($1, now())::date
                                  AND estado = 'COMPLETADA'
                                GROUP BY metodo_pago
                            `;
        
        // 2. GASTOS OPERATIVOS POR METODO (Excluye devoluciones de préstamo para no distorsionar gastos del taller)
        const gastosQuery = fecha
            ? `
                SELECT metodo_pago, SUM(monto) as total_gastos
                FROM movimientos_caja
                WHERE DATE(timezone($2, fecha_hora AT TIME ZONE 'UTC')) = $1::date
                  AND COALESCE(tipo_movimiento, 'SALIDA') = 'SALIDA'
                  AND concepto NOT ILIKE '%devolución préstamo%'
                GROUP BY metodo_pago
              `
            : `
                SELECT metodo_pago, SUM(monto) as total_gastos
                FROM movimientos_caja
                WHERE DATE(timezone($1, fecha_hora AT TIME ZONE 'UTC')) = timezone($1, now())::date
                  AND COALESCE(tipo_movimiento, 'SALIDA') = 'SALIDA'
                  AND concepto NOT ILIKE '%devolución préstamo%'
                GROUP BY metodo_pago
              `;

        // 3. Totales del día (Ventas y Gastos Operativos Reales)
        const ventasTotalQuery = fecha
            ? `
                SELECT COALESCE(SUM(total), 0) as total_ventas
                FROM ventas
                WHERE DATE(timezone($2, fecha_venta AT TIME ZONE 'UTC')) = $1::date
                  AND estado = 'COMPLETADA'
              `
            : `
                SELECT COALESCE(SUM(total), 0) as total_ventas
                FROM ventas
                WHERE DATE(timezone($1, fecha_venta AT TIME ZONE 'UTC')) = timezone($1, now())::date
                  AND estado = 'COMPLETADA'
              `;

        const gastosTotalQuery = fecha
            ? `
                SELECT COALESCE(SUM(monto), 0) as total_gastos
                FROM movimientos_caja
                WHERE DATE(timezone($2, fecha_hora AT TIME ZONE 'UTC')) = $1::date
                  AND COALESCE(tipo_movimiento, 'SALIDA') = 'SALIDA'
                  AND concepto NOT ILIKE '%devolución préstamo%'
              `
            : `
                SELECT COALESCE(SUM(monto), 0) as total_gastos
                FROM movimientos_caja
                WHERE DATE(timezone($1, fecha_hora AT TIME ZONE 'UTC')) = timezone($1, now())::date
                  AND COALESCE(tipo_movimiento, 'SALIDA') = 'SALIDA'
                  AND concepto NOT ILIKE '%devolución préstamo%'
              `;

        // 4. Entradas y salidas totales de efectivo en caja (incluye préstamos, devoluciones y gastos en efectivo)
        const movimientosEfectivoQuery = fecha
            ? `
                SELECT
                    COALESCE(SUM(CASE WHEN tipo_movimiento = 'ENTRADA' AND metodo_pago = 'Efectivo' THEN monto ELSE 0 END), 0) as entradas_efectivo,
                    COALESCE(SUM(CASE WHEN tipo_movimiento = 'SALIDA' AND metodo_pago = 'Efectivo' THEN monto ELSE 0 END), 0) as salidas_efectivo
                FROM movimientos_caja
                WHERE DATE(timezone($2, fecha_hora AT TIME ZONE 'UTC')) = $1::date
              `
            : `
                SELECT
                    COALESCE(SUM(CASE WHEN tipo_movimiento = 'ENTRADA' AND metodo_pago = 'Efectivo' THEN monto ELSE 0 END), 0) as entradas_efectivo,
                    COALESCE(SUM(CASE WHEN tipo_movimiento = 'SALIDA' AND metodo_pago = 'Efectivo' THEN monto ELSE 0 END), 0) as salidas_efectivo
                FROM movimientos_caja
                WHERE DATE(timezone($1, fecha_hora AT TIME ZONE 'UTC')) = timezone($1, now())::date
              `;

        // Ejecutamos consultas en paralelo
        const params = fecha ? [fecha, BUSINESS_TZ] : [BUSINESS_TZ];
        const [resVentas, resGastos, resVentasTotal, resGastosTotal, resMovEfectivo] = await Promise.all([
            pool.query(ventasQuery, params),
            pool.query(gastosQuery, params),
            pool.query(ventasTotalQuery, params),
            pool.query(gastosTotalQuery, params),
            pool.query(movimientosEfectivoQuery, params)
        ]);

        const totalVentas = Number(resVentasTotal.rows[0]?.total_ventas ?? 0);
        const totalGastos = Number(resGastosTotal.rows[0]?.total_gastos ?? 0);
        const gananciaNeta = totalVentas - totalGastos;
        const balanceNeto = monto_inicial + totalVentas - totalGastos;

        const ventaEfectivoRow = resVentas.rows.find(r => r.metodo_pago === 'Efectivo');
        const gastoEfectivoRow = resGastos.rows.find(r => r.metodo_pago === 'Efectivo');
        const ventasEfectivo = Number(ventaEfectivoRow?.total_ventas ?? 0);
        const gastosEfectivo = Number(gastoEfectivoRow?.total_gastos ?? 0);

        const entradasEfectivo = Number(resMovEfectivo.rows[0]?.entradas_efectivo ?? 0);
        const salidasEfectivo = Number(resMovEfectivo.rows[0]?.salidas_efectivo ?? 0);

        const efectivoEnCaja = monto_inicial + ventasEfectivo + entradasEfectivo - salidasEfectivo;

        // Estructuramos la respuesta
        return {
            monto_inicial: monto_inicial,
            total_ventas: totalVentas,
            total_gastos: totalGastos,
            ganancia_neta: gananciaNeta,
            ventas_efectivo: ventasEfectivo,
            gastos_efectivo: gastosEfectivo,
            entradas_efectivo: entradasEfectivo,
            salidas_efectivo: salidasEfectivo,
            efectivo_en_caja: efectivoEnCaja,
            ventas_desglose: resVentas.rows, 
            gastos_desglose: resGastos.rows,
            ganancia_dia: balanceNeto // Mantenido para retrocompatibilidad
        };

    } catch (err) {
        console.error("Error obteniendo resumen financiero: ", err.message);
        throw err;
    }
}
}

module.exports = new CajaService();