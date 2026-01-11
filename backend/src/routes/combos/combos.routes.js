const express = require("express");
const router = express.Router();
const CombosController = require("../../controllers/combos/combos.controller");

/**
 * @swagger
 * /getcombos:
 *   get:
 *     tags:
 *       - Combos
 *     summary: Obtener todos los combos con sus items
 *     responses:
 *       200:
 *         description: Lista de combos
 *       500:
 *         description: Error interno
 */
router.get("/getcombos", CombosController.getAll);

/**
 * @swagger
 * /getcombo/{id}:
 *   get:
 *     tags:
 *       - Combos
 *     summary: Obtener un combo específico por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos del combo
 *       404:
 *         description: No encontrado
 */
router.get("/getcombo/:id", CombosController.getById);

/**
 * @swagger
 * /postcombo:
 *   post:
 *     tags:
 *       - Combos
 *     summary: Crear un nuevo combo con sus items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreCombo:
 *                 type: string
 *               PrecioSugerido:
 *                 type: number
 *               Items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     IdItem:
 *                       type: integer
 *                     Cantidad:
 *                       type: integer
 *             example:
 *               NombreCombo: "Paquete Jetta 2010"
 *               PrecioSugerido: 600.00
 *               Items: [{"IdItem": 1, "Cantidad": 1}, {"IdItem": 5, "Cantidad": 1}]
 *     responses:
 *       201:
 *         description: Combo creado
 *       400:
 *         description: Error de validación
 */
router.post("/postcombo", CombosController.create);

/**
 * @swagger
 * /deletecombo/{id}:
 *   delete:
 *     tags:
 *       - Combos
 *     summary: Eliminar un combo (borra items relacionados automáticamente)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eliminado correctamente
 *       400:
 *         description: Error al eliminar
 */
router.delete("/deletecombo/:id", CombosController.delete);

module.exports = router;