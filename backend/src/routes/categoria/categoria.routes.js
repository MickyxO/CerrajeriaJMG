
const express = require("express");
const router = express.Router();
const CategoriaController = require("../../controllers/categoria/categoria.controller");

/**
 * @swagger
 * /getcategorias:
 *   get:
 *     tags:
 *       - Categoria
 *     summary: Retrieve all Categoria records
 *     responses:
 *       200:
 *         description: List of Categorias
 *       500:
 *          description: Internal error
 */
router.get("/getcategorias", CategoriaController.getAll);

/**
 * @swagger
 * /getcategoria/{nombre}:
 *   get:
 *     tags:
 *       - Categoria
 *     summary: Get Categoria records by name
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         description: Name to filter by
 *     responses:
 *       200:
 *         description: List of Categoria records for given country
 *       404:
 *         description: No records found
 */
router.get("/getcategoria/:nombre", CategoriaController.getByName);

/**
 * @swagger
 * /getcategoriasclasificacion/{clasificacion}:
 *   get:
 *     tags:
 *       - Categoria
 *     summary: Obtener categorías por clasificación
 *     parameters:
 *       - in: path
 *         name: clasificacion
 *         required: true
 *         schema:
 *           type: string
 *         description: Clasificación a filtrar (ej. Automotriz)
 *     responses:
 *       200:
 *         description: Lista de categorías para esa clasificación
 *       404:
 *         description: No se encontraron categorías
 *       500:
 *         description: Error del servidor
 */
router.get("/getcategoriasclasificacion/:clasificacion", CategoriaController.getByClassification);

/**
 * @swagger
 * /postcategoria:
 *   post:
 *     tags:
 *       - Categoria
 *     summary: Create a new Categoria record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombreCategoria:
 *                 type: string
 *               clasificacion:
 *                 type: string
 *             example:
 *               nombreCategoria: "Llave Control"
 *               clasificacion: "Automotriz"
 *     responses:
 *       201:
 *         description: Categoria created successfully
 *       500:
 *         description: Server error
 */
router.post("/postcategoria", CategoriaController.create);

/**
 * @swagger
 * /putcategoria/{id}:
 *   put:
 *     tags:
 *       - Categoria
 *     summary: Actualiza una categoría existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreCategoria:
 *                 type: string
 *               Clasificacion:
 *                 type: string
 *             example:
 *               NombreCategoria: "Llave Control"
 *               Clasificacion: "Automotriz"
 *     responses:
 *       200:
 *         description: Categoría actualizada correctamente
 *       400:
 *         description: Error de validación o datos inválidos
 *       500:
 *         description: Error del servidor
 */
router.put("/putcategoria/:id", CategoriaController.update);

/**
 * @swagger
 * /deletecategoria/{id}:
 *   delete:
 *     tags:
 *       - Categoria
 *     summary: Elimina una categoría por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría a eliminar
 *     responses:
 *       200:
 *         description: Categoría eliminada correctamente
 *       400:
 *         description: No se puede eliminar, hay productos relacionados
 *       500:
 *         description: Error del servidor
 */
router.delete("/deletecategoria/:id", CategoriaController.delete);

module.exports = router;