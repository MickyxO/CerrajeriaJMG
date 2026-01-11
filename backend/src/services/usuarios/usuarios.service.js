const pool = require("../../config/db");
const Usuarios = require("../../models/usuarios/usuarios.model");

class UsuariosService {

    // Helper para convertir de base de datos (snake_case) a modelo (PascalCase)
    _mapRowToModel(row) {
        return new Usuarios(
            row.id_usuario,
            row.nombre_completo,
            row.pin_acceso,
            row.rol,
            row.activo
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

    // Método especial para el Login en la PWA
    async verificarPin(pin) {
        try {
            // Buscamos si existe alguien con ese PIN y que esté activo
            const query = "SELECT * FROM usuarios WHERE pin_acceso = $1 AND activo = TRUE";
            const { rows } = await pool.query(query, [pin]);

            if (rows.length === 0) return null;

            // Retornamos el usuario encontrado para iniciar sesión
            return this._mapRowToModel(rows[0]);
        } catch (err) {
            console.error("Error verificando PIN: ", err.message);
            throw err;
        }
    }

    async createUsuario(datos) {
        const { NombreCompleto, PinAcceso, Rol } = datos;

        if (!NombreCompleto || !PinAcceso) {
            throw new Error("Nombre completo y PIN son obligatorios.");
        }

        if (PinAcceso.length !== 4) {
            throw new Error("El PIN debe ser de 4 dígitos.");
        }

        try {
            // Validar que el PIN no esté repetido (opcional pero recomendado)
            const pinCheck = await pool.query("SELECT 1 FROM usuarios WHERE pin_acceso = $1 AND activo = TRUE", [PinAcceso]);
            if (pinCheck.rowCount > 0) {
                throw new Error("Este PIN ya está en uso por otro usuario.");
            }

            const query = `
                INSERT INTO usuarios (nombre_completo, pin_acceso, rol, activo)
                VALUES ($1, $2, $3, TRUE)
                RETURNING id_usuario
            `;
            
            // Si no mandan rol, Postgres usará el default 'empleado' si pasamos DEFAULT, 
            // pero aquí lo manejamos desde node:
            const values = [NombreCompleto, PinAcceso, Rol || 'empleado'];

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
            'Activo': 'activo'
        };

        const columnas = [];
        const valores = [];
        let contador = 1;

        for (const [campoFront, campoBD] of Object.entries(mapaCampos)) {
            if (cuerpo[campoFront] !== undefined && cuerpo[campoFront] !== '') {
                columnas.push(`${campoBD} = $${contador}`);
                valores.push(cuerpo[campoFront]);
                contador++;
            }
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