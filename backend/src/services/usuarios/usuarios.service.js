const pool = require("../../config/db");
const Usuarios = require("../../models/usuarios/usuarios.model");
const bcrypt = require('bcryptjs');

class UsuariosService {

    // Helper para convertir de base de datos (snake_case) a modelo (PascalCase)
    // Importante: NUNCA exponer pin_acceso (hash) hacia el frontend.
    _mapRowToModel(row) {
        return new Usuarios(
            row.id_usuario,
            row.nombre_completo,
            undefined,
            row.rol,
            row.activo,
            row.username
        );
    }

    async getAllUsuarios() {
        try {

            const query = "SELECT * FROM usuarios WHERE activo = TRUE ORDER BY nombre_completo ASC";
            const { rows } = await pool.query(query);

            return rows.map(row => this._mapRowToModel(row));
        } catch (err) {
            console.error("Error obteniendo usuarios: ", err.message);
            throw err;
        }
    }

    async getUsuarioById(id) {
        try {
            const query = "SELECT * FROM usuarios WHERE id_usuario = $1 AND activo = TRUE";
            const { rows } = await pool.query(query, [id]);

            if (rows.length === 0) return null;

            return this._mapRowToModel(rows[0]);
        } catch (err) {
            console.error("Error obteniendo usuario por ID: ", err.message);
            throw err;
        }
    }


    async verificarPin(username, pin) {
        try {
            if (!pin || !username) return null;

            const query = "SELECT * FROM usuarios WHERE activo = TRUE AND username = $1";
            const { rows } = await pool.query(query, [username]);

            if (rows.length === 0) return null;

            const row = rows[0];
            const esValido = await bcrypt.compare(String(pin), row.pin_acceso);
            if (esValido) return this._mapRowToModel(row);

            return null;
        } catch (err) {
            console.error("Error verificando PIN: ", err.message);
            throw err;
        }
    }

    _validarContrasena(pinAcceso) {
        const value = String(pinAcceso ?? "");
        const tieneNumero = /\d/.test(value);
        const tieneSimbolo = /[.,\-]/.test(value);
        if (value.length < 6 || !tieneNumero || !tieneSimbolo) {
            throw new Error(
                "La contraseña debe tener mínimo 6 caracteres e incluir al menos un número y un símbolo (.,-)."
            );
        }
    }

    async createUsuario(datos) {
        const { NombreCompleto, PinAcceso, Rol } = datos;
        const Username = datos?.Username ?? datos?.username;

        if (!NombreCompleto || !PinAcceso || !Username) {
            throw new Error("Nombre completo, contraseña y username son obligatorios.");
        }

        this._validarContrasena(PinAcceso);

        

        try {
            // Validar username único (el constraint UNIQUE también lo hará, esto es solo para mensaje claro)
            const existenteUsername = await pool.query(
                "SELECT 1 FROM usuarios WHERE username = $1 LIMIT 1",
                [Username]
            );
            if (existenteUsername.rows.length > 0) {
                throw new Error("El username ya está en uso.");
            }

            const pinEncriptado = await bcrypt.hash(String(PinAcceso), 10);

            const query = `
                INSERT INTO usuarios (nombre_completo, pin_acceso, rol, activo, username)
                VALUES ($1, $2, $3, TRUE, $4)
                RETURNING id_usuario
            `;
            
            // Si no mandan rol, Postgres usará el default 'empleado' si pasamos DEFAULT, 
            // pero aquí lo manejamos desde node:
            const values = [NombreCompleto, pinEncriptado, Rol || 'empleado', Username];

            const { rows } = await pool.query(query, values);
            return rows[0].id_usuario;

        } catch (err) {
            console.error("Error creando usuario: ", err.message);
            throw err;
        }
    }

    async updateUsuario(id, cuerpo) {
        // Mapeo dinámico para actualizaciones parciales
        const mapaCampos = {
            'NombreCompleto': 'nombre_completo',
            'PinAcceso': 'pin_acceso',
            'Rol': 'rol',
            'Activo': 'activo',
            'Username': 'username'
        };

        const columnas = [];
        const valores = [];
        let contador = 1;

        for (const [campoFront, campoBD] of Object.entries(mapaCampos)) {
            if (cuerpo[campoFront] === undefined || cuerpo[campoFront] === '') continue;

            if (campoFront === 'PinAcceso') {
                this._validarContrasena(cuerpo[campoFront]);
                const pinEncriptado = await bcrypt.hash(String(cuerpo[campoFront]), 10);
                columnas.push(`${campoBD} = $${contador}`);
                valores.push(pinEncriptado);
                contador++;
                continue;
            }

            if (campoFront === 'Username') {
                const nuevoUsername = String(cuerpo[campoFront]).trim();
                if (!nuevoUsername) throw new Error("Username inválido.");

                const existenteUsername = await pool.query(
                    "SELECT 1 FROM usuarios WHERE username = $1 AND id_usuario <> $2 LIMIT 1",
                    [nuevoUsername, id]
                );
                if (existenteUsername.rows.length > 0) {
                    throw new Error("El username ya está en uso.");
                }

                columnas.push(`${campoBD} = $${contador}`);
                valores.push(nuevoUsername);
                contador++;
                continue;
            }

            columnas.push(`${campoBD} = $${contador}`);
            valores.push(cuerpo[campoFront]);
            contador++;
        }

        if (columnas.length === 0) {
            throw new Error("No hay campos válidos para actualizar.");
        }

        valores.push(id);

        try {
            const query = `UPDATE usuarios SET ${columnas.join(", ")} WHERE id_usuario = $${contador} RETURNING *`;
            const { rowCount, rows } = await pool.query(query, valores);

            if (rowCount === 0) throw new Error("Usuario no encontrado.");

            return this._mapRowToModel(rows[0]);

        } catch (err) {
            console.error("Error actualizando usuario: ", err.message);
            throw err;
        }
    }

    async deleteUsuario(id) {
        try {
            // Borrado Lógico (Soft Delete)
            const query = "UPDATE usuarios SET activo = FALSE WHERE id_usuario = $1 RETURNING id_usuario";
            const { rowCount } = await pool.query(query, [id]);

            if (rowCount === 0) throw new Error("Usuario no encontrado.");

            return { message: "Usuario desactivado correctamente." };

        } catch (err) {
            console.error("Error eliminando usuario: ", err.message);
            throw err;
        }
    }
}

module.exports = new UsuariosService();