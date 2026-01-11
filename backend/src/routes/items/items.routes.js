const express = require("express");
const router = express.Router();
const ItemsController = require("../../controllers/items/items.controller");

/**
 * @swagger
 * /getproductos:
 *   get:
 *     tags:
 *       - Producto
 *     summary: Obtener todos los productos
 *     responses:
 *       200:
 *         description: Lista de productos
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getproductos", ItemsController.getAll);

/**
 * @swagger
 * /getproductos/categoria/{idCategoria}:
 *   get:
 *     tags:
 *       - Producto
 *     summary: Obtener productos por ID de categoría
 *     parameters:
 *       - in: path
 *         name: idCategoria
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Lista de productos de la categoría
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getproductos/categoria/:idCategoria", ItemsController.getByCategoria);

/**
 * @swagger
 * /getproductos/marca/{idMarca}:
 *   get:
 *     tags:
 *       - Producto
 *     summary: Obtener productos por ID de marca
 *     parameters:
 *       - in: path
 *         name: idMarca
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la marca
 *     responses:
 *       200:
 *         description: Lista de productos de la marca
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getproductos/marca/:idMarca", ItemsController.getByMarca);

/**
 * @swagger
 * /buscarproducto:
 *   get:
 *     tags:
 *       - Producto
 *     summary: Buscar productos por coincidencia parcial de nombre
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto parcial para buscar productos
 *     responses:
 *       200:
 *         description: Lista de productos coincidentes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/buscarproducto", ItemsController.searchByNombre);

/**
 * @swagger
 * /postproducto:
 *   post:
 *     tags:
 *       - Producto
 *     summary: Crear un nuevo producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nombre:
 *                 type: string
 *               Descripcion:
 *                 type: string
 *               IdCategoria:
 *                 type: integer
 *               Activo:
 *                 type: boolean
 *               PrecioVenta:
 *                 type: number
 *               IdMarca:
 *                 type: integer
 *             example:
 *               Nombre: "Producto Ejemplo"
 *               Descripcion: "Descripción del producto"
 *               IdCategoria: 1
 *               Activo: true
 *               PrecioVenta: 100.50
 *               IdMarca: 2
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.post("/postproducto", ItemsController.create);

/**
 * @swagger
 * /putproducto/{id}:
 *   put:
 *     tags:
 *       - Producto
 *     summary: Actualizar un producto existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nombre:
 *                 type: string
 *               Descripcion:
 *                 type: string
 *               IdCategoria:
 *                 type: integer
 *               Activo:
 *                 type: boolean
 *               PrecioVenta:
 *                 type: number
 *               IdMarca:
 *                 type: integer
 *             example:
 *               Nombre: "Producto Actualizado"
 *               Descripcion: "Nueva descripción"
 *               IdCategoria: 2
 *               Activo: true
 *               PrecioVenta: 150.00
 *               IdMarca: 3
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.put("/putproducto/:id", ItemsController.update);

/**
 * @swagger
 * /deleteproducto/{id}:
 *   delete:
 *     tags:
 *       - Producto
 *     summary: Eliminar un producto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a eliminar
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       400:
 *         description: No se puede eliminar
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/deleteproducto/:id", ItemsController.delete);

module.exports = router;