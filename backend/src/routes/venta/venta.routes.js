const express = require("express");
const router = express.Router();
const VentaController = require("../../controllers/venta/venta.controller");

/**
 * @swagger
 * /getventas:
 *   get:
 *     tags:
 *       - Venta
 *     summary: "Obtener lista de ventas (por defecto: hoy)"
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Lista de ventas
 *       500:
 *         description: Error interno
 */
router.get("/getventas", VentaController.getAll);

/**
 * @swagger
 * /getventa/{id}:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Obtener el detalle de una venta por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la venta
 *       404:
 *         description: Venta no encontrada
 *       500:
 *         description: Error interno
 */
router.get("/getventa/:id", VentaController.getById);

/**
 * @swagger
 * /getventasdetalladasdia:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Obtener ventas del día con detalle de items
 *     responses:
 *       200:
 *         description: Lista de ventas del día con items agregados
 *       500:
 *         description: Error interno
 */
router.get("/getventasdetalladasdia", VentaController.getDetalladasDia);

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
 *         description: Texto parcial para filtrar por nombre_cliente
 *     responses:
 *       200:
 *         description: Lista de ventas coincidentes
 *       400:
 *         description: Falta el parámetro q
 *       500:
 *         description: Error interno
 */
router.get("/buscarventacliente", VentaController.getByClienteName);

/**
 * @swagger
 * /buscarventafecha:
 *   get:
 *     tags:
 *       - Venta
 *     summary: Buscar ventas por fecha específica
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
 *         description: Lista de ventas en esa fecha
 *       400:
 *         description: Falta el parámetro fecha
 *       500:
 *         description: Error interno
 */
router.get("/buscarventafecha", VentaController.getByFecha);

/**
 * @swagger
 * /postventa:
 *   post:
 *     tags:
 *       - Venta
 *     summary: Crear una venta (cabecera + detalle) desde un carrito
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datosVenta:
 *                 type: object
 *                 properties:
 *                   idUsuario:
 *                     type: integer
 *                   total:
 *                     type: number
 *                   metodoPago:
 *                     type: string
 *                   nombreCliente:
 *                     type: string
 *                   notas:
 *                     type: string
 *                   requiereFactura:
 *                     type: boolean
 *                     description: "Si es true, se calcula IVA (16%) y se suma al total"
 *               carrito:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tipo:
 *                       type: string
 *                       description: ITEM o COMBO
 *                     id:
 *                       type: integer
 *                     cantidad:
 *                       type: integer
 *                     precio:
 *                       type: number
 *             example:
 *               datosVenta: {"idUsuario": 1, "total": 600.00, "metodoPago": "Efectivo", "nombreCliente": "Mostrador", "notas": "", "requiereFactura": true}
 *               carrito: [{"tipo": "ITEM", "id": 1, "cantidad": 1, "precio": 600.00}]
 *     responses:
 *       201:
 *         description: Venta creada exitosamente
 *       400:
 *         description: Error de validación / reglas de negocio
 *       500:
 *         description: Error interno
 */
router.post("/postventa", VentaController.create);

/**
 * @swagger
 * /putventa/{id}:
 *   put:
 *     tags:
 *       - Venta
 *     summary: Actualizar metadatos de la venta (NombreCliente/Notas)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreCliente:
 *                 type: string
 *               Notas:
 *                 type: string
 *             example:
 *               NombreCliente: "Cliente X"
 *               Notas: "Nota"
 *     responses:
 *       200:
 *         description: Venta actualizada
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno
 */
router.put("/putventa/:id", VentaController.update);

/**
 * @swagger
 * /anularventa/{id}:
 *   post:
 *     tags:
 *       - Venta
 *     summary: Anular una venta (revierte inventario + caja si fue efectivo)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idUsuario:
 *                 type: integer
 *               motivo:
 *                 type: string
 *           example:
 *             idUsuario: 1
 *             motivo: "Cantidad incorrecta"
 *     responses:
 *       200:
 *         description: Venta anulada
 *       400:
 *         description: Error de validación/reglas de negocio
 */
router.post("/anularventa/:id", VentaController.anular);

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
 *     responses:
 *       200:
 *         description: Eliminada correctamente
 *       400:
 *         description: No se puede eliminar
 *       500:
 *         description: Error interno
 */
router.delete("/deleteventa/:id", VentaController.delete);

module.exports = router;
