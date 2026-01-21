const express = require("express");
const router = express.Router();
const ItemsController = require("../../controllers/items/items.controller");
const { uploadItemImage } = require("../../middlewares/upload");

/**
 * @swagger
 * /getitems:
 *   get:
 *     tags:
 *       - Items
 *     summary: Obtener todos los items activos
 *     responses:
 *       200:
 *         description: Lista de items
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getitems", ItemsController.getAll);

/**
 * @swagger
 * /getitem/{id}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Obtener un item por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item
 *       - in: query
 *         name: incluyeInactivos
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Si es true, permite devolver items inactivos
 *     responses:
 *       200:
 *         description: Item encontrado
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Item no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getitem/:id", ItemsController.getById);

/**
 * @swagger
 * /getitems/categoria/{idCategoria}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Obtener items por ID de categoría
 *     parameters:
 *       - in: path
 *         name: idCategoria
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Lista de items de la categoría
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getitems/categoria/:idCategoria", ItemsController.getByCategoria);

/**
 * @swagger
 * /getitems/marca/{marca}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Obtener items por coincidencia de marca (compatibilidad_marca)
 *     parameters:
 *       - in: path
 *         name: marca
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto o fragmento de marca para buscar en compatibilidad_marca
 *     responses:
 *       200:
 *         description: Lista de items coincidentes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getitems/marca/:marca", ItemsController.getByMarca);

/**
 * @swagger
 * /getitems/clasificacion/{clasificacion}:
 *   get:
 *     tags:
 *       - Items
 *     summary: Obtener items por coincidencia de clasificación (categorías.clasificacion)
 *     parameters:
 *       - in: path
 *         name: clasificacion
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto o fragmento de clasificación para buscar en categorias.clasificacion
 *     responses:
 *       200:
 *         description: Lista de items coincidentes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getitems/clasificacion/:clasificacion", ItemsController.getByClasificacion);

/**
 * @swagger
 * /buscaritems:
 *   get:
 *     tags:
 *       - Items
 *     summary: Buscar items por coincidencia parcial de nombre
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Texto parcial para buscar items
 *     responses:
 *       200:
 *         description: Lista de items coincidentes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/buscaritems", ItemsController.searchByNombre);

/**
 * @swagger
 * /postitem:
 *   post:
 *     tags:
 *       - Items
 *     summary: Crear un nuevo item
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
 *               PrecioVenta:
 *                 type: number
 *               CostoReferencia:
 *                 type: number
 *                 nullable: true
 *               EsServicio:
 *                 type: boolean
 *               StockActual:
 *                type: integer
 *               StockMinimo:
 *                 type: integer
 *               CompatibilidadMarca:
 *                 type: string
 *                 nullable: true
 *               TipoChip:
 *                 type: string
 *                 nullable: true
 *               Frecuencia:
 *                 type: string
 *                 nullable: true
 *             example:
 *               Nombre: "Item Ejemplo"
 *               Descripcion: "Descripción del item"
 *               IdCategoria: 1
 *               PrecioVenta: 100.50
 *               CostoReferencia: 80.00
 *               EsServicio: false
 *               StockActual: 10
 *               StockMinimo: 2
 *               CompatibilidadMarca: "Volkswagen"
 *               TipoChip: "ID48"
 *               Frecuencia: "433MHz"
 *     responses:
 *       201:
 *         description: Item creado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.post("/postitem", ItemsController.create);

/**
 * @swagger
 * /putitem/{id}:
 *   put:
 *     tags:
 *       - Items
 *     summary: Actualizar un item existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item a actualizar
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
 *               PrecioVenta:
 *                 type: number
 *               CostoReferencia:
 *                 type: number
 *                 nullable: true
 *               EsServicio:
 *                 type: boolean
 *               StockActual:
 *                 type: integer
 *               StockMinimo:
 *                 type: integer
 *               CompatibilidadMarca:
 *                 type: string
 *                 nullable: true
 *               TipoChip:
 *                 type: string
 *                 nullable: true
 *               Frecuencia:
 *                 type: string
 *                 nullable: true
 *               Activo:
 *                 type: boolean
 *             example:
 *               Nombre: "Item Actualizado"
 *               Descripcion: "Nueva descripción"
 *               IdCategoria: 2
 *               PrecioVenta: 150.00
 *               CostoReferencia: 120.00
 *               EsServicio: false
 *               StockActual: 10
 *               StockMinimo: 2
 *               CompatibilidadMarca: "Nissan"
 *               TipoChip: "ID46"
 *               Frecuencia: "315MHz"
 *               Activo: true
 *     responses:
 *       200:
 *         description: Item actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.put("/putitem/:id", ItemsController.update);

/**
 * @swagger
 * /putitemimagen/{id}:
 *   put:
 *     tags:
 *       - Items
 *     summary: Subir/actualizar la imagen de un item (multipart/form-data)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagen:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen actualizada correctamente
 *       400:
 *         description: Error de validación
 */
router.put(
	"/putitemimagen/:id",
	uploadItemImage.single("imagen"),
	ItemsController.uploadImagen
);

/**
 * @swagger
 * /deleteitem/{id}:
 *   delete:
 *     tags:
 *       - Items
 *     summary: Eliminar (desactivar) un item por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item a desactivar
 *     responses:
 *       200:
 *         description: Item desactivado correctamente
 *       400:
 *         description: No se puede eliminar
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/deleteitem/:id", ItemsController.delete);

module.exports = router;