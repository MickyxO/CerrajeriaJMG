const express = require("express");
const router = express.Router();
const InventarioController = require("../../controllers/inventario/inventario.controller");

/**
 * @swagger
 * /getmovimientosinventario:
 *   get:
 *     tags:
 *       - Inventario
 *     summary: "Obtener movimientos de inventario (opcional: por item y rango de fechas)"
 *     parameters:
 *       - in: query
 *         name: idItem
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: fechaInicio
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de movimientos
 */
router.get("/getmovimientosinventario", InventarioController.getMovimientos);

/**
 * @swagger
 * /postajustestock:
 *   post:
 *     tags:
 *       - Inventario
 *     summary: Ajustar stock absoluto de un item y registrar movimiento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idItem:
 *                 type: integer
 *               nuevoStockActual:
 *                 type: integer
 *               idUsuario:
 *                 type: integer
 *               comentario:
 *                 type: string
 *             required:
 *               - idItem
 *               - nuevoStockActual
 *               - idUsuario
 *     responses:
 *       200:
 *         description: Stock ajustado
 */
router.post("/postajustestock", InventarioController.ajustarStock);

module.exports = router;
