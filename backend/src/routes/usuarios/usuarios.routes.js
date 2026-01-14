const express = require("express");
const router = express.Router();
const UsuariosController = require("../../controllers/usuarios/usuarios.controller");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 5, // Limite de 5 intentos
	message: {
		success: false,
		message: "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * @swagger
 * /getusuarios:
 *   get:
 *     tags:
 *       - Usuarios
 *     summary: Obtener todos los usuarios activos
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getusuarios", UsuariosController.getAll);

/**
 * @swagger
 * /getusuario/{id}:
 *   get:
 *     tags:
 *       - Usuarios
 *     summary: Obtener un usuario por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/getusuario/:id", UsuariosController.getById);

/**
 * @swagger
 * /login:
 *   post:
 *     tags:
 *       - Usuarios
 *     summary: Iniciar sesión con username + contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               pin:
 *                 type: string
 *             example:
 *               username: "juan"
 *               pin: "pass123,"
 *     responses:
 *       200:
 *         description: Acceso correcto
 *       401:
 *         description: PIN incorrecto o usuario inactivo
 *       500:
 *         description: Error interno del servidor
 */
router.post("/login", loginLimiter, UsuariosController.login);

/**
 * @swagger
 * /postusuario:
 *   post:
 *     tags:
 *       - Usuarios
 *     summary: Crear un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreCompleto:
 *                 type: string
 *               Username:
 *                 type: string
 *               PinAcceso:
 *                 type: string
 *               Rol:
 *                 type: string
 *             example:
 *               NombreCompleto: "Juan Pérez"
 *               Username: "juan"
 *               PinAcceso: "pass123,"
 *               Rol: "empleado"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error de validación (ej. PIN duplicado)
 *       500:
 *         description: Error interno del servidor
 */
router.post("/postusuario", UsuariosController.create);

/**
 * @swagger
 * /putusuario/{id}:
 *   put:
 *     tags:
 *       - Usuarios
 *     summary: Actualizar un usuario existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreCompleto:
 *                 type: string
 *               PinAcceso:
 *                 type: string
 *               Rol:
 *                 type: string
 *               Activo:
 *                 type: boolean
 *             example:
 *               NombreCompleto: "Juan P. Actualizado"
 *               Rol: "admin"
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.put("/putusuario/:id", UsuariosController.update);

/**
 * @swagger
 * /deleteusuario/{id}:
 *   delete:
 *     tags:
 *       - Usuarios
 *     summary: Desactivar (eliminar lógicamente) un usuario por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario desactivado exitosamente
 *       400:
 *         description: No se puede eliminar
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/deleteusuario/:id", UsuariosController.delete);

module.exports = router;