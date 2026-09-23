const UsuariosService = require("../../services/usuarios/usuarios.service");

class UsuariosController {

    async getAll(req, res) {
        try {
            const incluyeInactivosRaw = req.query?.incluyeInactivos;
            const incluyeInactivos = incluyeInactivosRaw === true || incluyeInactivosRaw === 1 || incluyeInactivosRaw === 'true' || incluyeInactivosRaw === '1';
            const usuarios = await UsuariosService.getAllUsuarios(incluyeInactivos);
            res.status(200).json(usuarios);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getById(req, res) {
        try {
            const id = req.params.id;
            const incluyeInactivosRaw = req.query?.incluyeInactivos;
            const incluyeInactivos = incluyeInactivosRaw === true || incluyeInactivosRaw === 1 || incluyeInactivosRaw === 'true' || incluyeInactivosRaw === '1';
            const usuario = await UsuariosService.getUsuarioById(id, incluyeInactivos);
            
            if (!usuario) {
                return res.status(404).json({ error: "Usuario no encontrado" });
            }
            
            res.status(200).json(usuario);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // Login ligero por PIN / Contraseña (sin JWT)
    async login(req, res) {
        try {
            const { username, pin } = req.body; 
            
            if (!username || !pin) {
                return res.status(400).json({ error: "Username y contraseña son obligatorios" });
            }

            const usuario = await UsuariosService.verificarPin(username, pin);

            if (!usuario) {
                return res.status(401).json({ error: "Credenciales incorrectas o usuario inactivo" });
            }

            // En intranet: devolvemos directamente el usuario para que el front guarde id_usuario en LocalStorage
            res.status(200).json({ message: "Acceso correcto", usuario });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async me(req, res) {
        res.status(200).json({ ok: true });
    }

    async create(req, res) {
        try {
            const insertId = await UsuariosService.createUsuario(req.body);
            res.status(201).json({ message: "Usuario creado exitosamente", insertId });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const result = await UsuariosService.updateUsuario(id, req.body);
            res.status(200).json({ message: "Usuario actualizado exitosamente", result });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await UsuariosService.deleteUsuario(id);
            res.status(200).json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new UsuariosController();