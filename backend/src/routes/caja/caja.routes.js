const express = require("express");
const router = express.Router();
const CajaController = require("../../controllers/caja/caja.controller");

/**
 * @swagger
 * /getcajaestado:
 * get:
 * tags:
 * - Caja
 * summary: Obtener el estado actual de la caja (ABIERTA/CERRADA)
 * responses:
 * 200:
 * description: Estado de la caja del día
 * 500:
 * description: Error interno
 */
router.get("/getcajaestado", CajaController.getEstadoCaja);

/**
 * @swagger
 * /postabrircaja:
 * post:
 * tags:
 * - Caja
 * summary: Abrir caja del día
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * montoInicial:
 * type: number
 * idUsuario:
 * type: integer
 * example:
 * montoInicial: 500.00
 * idUsuario: 1
 * responses:
 * 201:
 * description: Caja abierta exitosamente
 * 400:
 * description: Error de validación
 * 409:
 * description: Ya existe una caja abierta
 * 500:
 * description: Error interno
 */
router.post("/postabrircaja", CajaController.abrirCaja);

/**
 * @swagger
 * /postcerrarcaja:
 * post:
 * tags:
 * - Caja
 * summary: Cerrar la caja abierta
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * montoFinalFisico:
 * type: number
 * idUsuario:
 * type: integer
 * example:
 * montoFinalFisico: 2450.00
 * idUsuario: 1
 * responses:
 * 200:
 * description: Caja cerrada correctamente
 * 400:
 * description: Error de validación
 * 500:
 * description: Error interno
 */
router.post("/postcerrarcaja", CajaController.cerrarCaja);

/**
 * @swagger
 * /postgasto:
 * post:
 * tags:
 * - Caja
 * summary: Registrar un gasto (salida de dinero)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * Monto:
 * type: number
 * Concepto:
 * type: string
 * IdUsuario:
 * type: integer
 * MetodoPago:
 * type: string
 * example:
 * Monto: 120.00
 * Concepto: "Compra de thiner"
 * IdUsuario: 1
 * MetodoPago: "Efectivo"
 * responses:
 * 201:
 * description: Gasto registrado correctamente
 * 400:
 * description: Error de validación
 * 500:
 * description: Error interno
 */
router.post("/postgasto", CajaController.registrarGasto);

/**
 * @swagger
 * /getmovimientoscaja:
 * get:
 * tags:
 * - Caja
 * summary: Obtener lista de movimientos del día (ventas + salidas)
 * responses:
 * 200:
 * description: Lista de movimientos
 * 500:
 * description: Error interno
 */
router.get("/getmovimientoscaja", CajaController.getMovimientos);

/**
 * @swagger
 * /getresumencaja:
 * get:
 * tags:
 * - Caja
 * summary: Obtener el resumen financiero del día (ventas, gastos, balance)
 * responses:
 * 200:
 * description: Resumen financiero
 * 500:
 * description: Error interno
 */
router.get("/getresumencaja", CajaController.getResumenFinanciero);

module.exports = router;
