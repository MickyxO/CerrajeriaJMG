const CajaService = require("../../services/caja/caja.service");

function toIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const raw = String(value);
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

class CajaController {

    // GET: Obtener el estado actual de la caja (si está abierta o cerrada)
    async getEstadoCaja(req, res) {
        try {
            const { fecha } = req.query || {};

            if (fecha) {
                const caja = await CajaService.getCajaPorFecha(fecha);
                if (!caja) {
                    return res.status(200).json({
                        success: true,
                        estado: 'SIN_CAJA',
                        data: null,
                        message: "No hay caja registrada para la fecha indicada."
                    });
                }
                return res.status(200).json({
                    success: true,
                    estado: caja.Estado || 'CERRADA',
                    data: caja
                });
            }

            // Si hay una caja vieja abierta, se cierra automáticamente antes de informar estado.
            await CajaService.autoCloseOpenCajaIfNeeded();

            const [cajaAbierta, bizNow, ultimoCierreAuto] = await Promise.all([
                CajaService.getCajaAbierta(),
                CajaService.getBusinessNowInfo(),
                CajaService.getUltimoCierreAutomaticoReciente(),
            ]);

            const autoCloseNotice = ultimoCierreAuto
                ? {
                    ...ultimoCierreAuto,
                    message: "Se detectó un cierre automático de caja (23:59 CDMX o por caja de día previo sin cierre manual)."
                }
                : null;

            if (!cajaAbierta) {
                return res.status(200).json({ 
                    success: true, 
                    estado: 'CERRADA', 
                    data: null,
                    autoCloseNotice,
                    message: "No hay caja abierta actualmente." 
                });
            }

            const fechaApertura = toIsoDate(cajaAbierta?.FechaApertura);
            const fechaLocal = bizNow?.fechaLocal;
            const esOtroDia = Boolean(fechaApertura && fechaLocal && fechaApertura !== fechaLocal);

            const warningMessage = esOtroDia
                ? `Ya existe una caja abierta del ${fechaApertura}. Debes cerrarla antes de abrir una nueva.`
                : "Caja abierta actualmente.";

            return res.status(200).json({ 
                success: true, 
                estado: 'ABIERTA', 
                data: cajaAbierta,
                autoCloseNotice,
                alertType: esOtroDia ? 'OPEN_OTHER_DAY' : 'OPEN',
                message: warningMessage
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // GET: Obtener lista de fechas con caja registrada
    async getFechasCaja(req, res) {
        try {
            const limit = req.query?.limit;
            const fechas = await CajaService.getFechasCaja(limit);
            return res.status(200).json({ success: true, data: fechas });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST: Abrir caja
    async abrirCaja(req, res) {
        try {
            const { montoInicial, idUsuario } = req.body;

            // Validación básica
            if (montoInicial === undefined) {
                return res.status(400).json({ success: false, message: "El monto inicial es requerido." });
            }

            const idCaja = await CajaService.abrirCaja(montoInicial, idUsuario);
            
            return res.status(201).json({ 
                success: true, 
                message: "Caja abierta exitosamente.", 
                id_caja: idCaja 
            });

        } catch (err) {
            // Manejo de errores específicos del servicio
            if (err.message.includes("Ya existe una caja abierta") || err.message.includes("Ya se abrió una caja")) {
                return res.status(409).json({ success: false, message: err.message }); // 409 Conflict
            }
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST: Cerrar caja
    async cerrarCaja(req, res) {
        try {
            const { montoFinalFisico, idUsuario } = req.body;

            if (montoFinalFisico === undefined) {
                return res.status(400).json({ success: false, message: "El monto final físico es requerido." });
            }

            const cajaCerrada = await CajaService.cerrarCaja(idUsuario, montoFinalFisico);

            return res.status(200).json({ 
                success: true, 
                message: "Caja cerrada correctamente.", 
                data: cajaCerrada 
            });

        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // PUT: Actualizar monto inicial de la caja abierta de hoy
    async actualizarMontoInicialCaja(req, res) {
        try {
            const { montoInicial, idUsuario } = req.body || {};

            if (montoInicial === undefined) {
                return res.status(400).json({ success: false, message: "El monto inicial es requerido." });
            }

            const data = await CajaService.actualizarMontoInicialCaja(montoInicial, idUsuario);

            return res.status(200).json({
                success: true,
                message: "Monto inicial actualizado correctamente.",
                data,
            });
        } catch (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
    }

    // POST: Registrar un gasto (Salida de dinero)
    async registrarGasto(req, res) {
        try {
            // Esperamos: { Monto, Concepto, IdUsuario, MetodoPago }
            const datosGasto = req.body; 

            const idMovimiento = await CajaService.registrarGasto(datosGasto);

            return res.status(201).json({ 
                success: true, 
                message: "Gasto registrado correctamente.", 
                id_movimiento: idMovimiento 
            });

        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // PUT: Actualizar un gasto (concepto/monto/metodo)
    async actualizarGasto(req, res) {
        try {
            const id = req.params.id;
            const result = await CajaService.actualizarGasto(id, req.body);
            return res.status(200).json({ success: true, message: "Gasto actualizado correctamente.", data: result });
        } catch (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
    }

    // POST: Anular un gasto (pone monto=0 y revierte caja si fue efectivo)
    async anularGasto(req, res) {
        try {
            const id = req.params.id;
            const result = await CajaService.anularGasto(id, req.body || {});
            return res.status(200).json({
                success: true,
                message: result.yaAnulado ? "Gasto ya estaba anulado." : "Gasto anulado correctamente.",
                result
            });
        } catch (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
    }

    // GET: Obtener lista de movimientos del día
    async getMovimientos(req, res) {
        try {
            const { fecha } = req.query || {};
            const movimientos = await CajaService.getMovimientosDelDia(fecha || null);
            return res.status(200).json({ success: true, data: movimientos });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // GET: Obtener el resumen financiero (Ventas, Gastos, Balance)
    async getResumenFinanciero(req, res) {
        try {
            const { fecha } = req.query || {};
            const resumen = await CajaService.getResumenFinancieroDia(fecha || null);
            return res.status(200).json({ success: true, data: resumen });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new CajaController();