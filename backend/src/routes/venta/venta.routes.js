const express = require("express");
const router = express.Router();
const VentaController = require("../../controllers/venta/venta.controller");

/**
 * @swagger
 * /getventas:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Obtener todas las ventas
 *     responses:
 *       200:
 *         description: Lista de ventas
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getventas", VentaController.getAll);

/**
 * @swagger
 * /buscarventacliente:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Buscar ventas por coincidencia parcial de nombre de cliente
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto parcial para buscar ventas por nombre de cliente
 *     responses:
 *       200:
 *         description: Lista de ventas coincidentes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/buscarventacliente", VentaController.getByClienteName);

/**
 * @swagger
 * /buscarventafecha:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Buscar ventas por fecha
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de la venta (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de ventas en la fecha indicada
 *       500:
 *         description: Error interno del servidor
 */
router.get("/buscarventafecha", VentaController.getByFecha);

/**
 * @swagger
 * /postventa:
 *   post:
 *     tags:
 *       - Venta
 *     summary: Registrar una nueva venta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FechaVenta:
 *                 type: string
 *                 format: date
 *               IdCliente:
 *                 type: integer
 *               TotalVenta:
 *                 type: number
 *               MetodoPago:
 *                 type: string
 *             example:
 *               FechaVenta: "2024-06-01"
 *               IdCliente: 1
 *               TotalVenta: 1500.50
 *               MetodoPago: "Efectivo"
 *     responses:
 *       201:
 *         description: Venta registrada exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.post("/postventa", VentaController.create);

/**
 * @swagger
 * /putventa/{id}:
 *   put:
 *     tags:
 *       - Venta
 *     summary: Actualizar una venta existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la venta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FechaVenta:
 *                 type: string
 *                 format: date
 *               IdCliente:
 *                 type: integer
 *               TotalVenta:
 *                 type: number
 *               MetodoPago:
 *                 type: string
 *             example:
 *               FechaVenta: "2024-06-02"
 *               IdCliente: 2
 *               TotalVenta: 2000.00
 *               MetodoPago: "Tarjeta"
 *     responses:
 *       200:
 *         description: Venta actualizada exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.put("/putventa/:id", VentaController.update);

/**
 * @swagger
 * /deleteventa/{id}:
 *   delete:
 *     tags:
 *       - Venta
 *     summary: Eliminar una venta por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la venta a eliminar
 *     responses:
 *       200:
 *         description: Venta eliminada exitosamente
 *       400:
 *         description: No se puede eliminar
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/deleteventa/:id", VentaController.delete);

module.exports = router;