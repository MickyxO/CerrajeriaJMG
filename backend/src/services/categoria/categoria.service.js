const pool = require("../../config/db");
const Categoria = require("../../models/categoria/categoria.model");

let ensureCategoriaSchemaPromise = null;

async function ensureCategoriaSchema() {
    if (!ensureCategoriaSchemaPromise) {
        ensureCategoriaSchemaPromise = pool.query(
            "ALTER TABLE categorias ADD COLUMN IF NOT EXISTS imagen_url TEXT"
        );
    }
    await ensureCategoriaSchemaPromise;
}

class CategoriaService {

    _mapRowToModel(row) {
        return new Categoria(row.id_categoria, row.nombre, row.clasificacion, row.imagen_url ?? null);
    }

    async getAllCategoria() {
        try {
            await ensureCategoriaSchema();
            const { rows } = await pool.query("SELECT * FROM categorias ORDER BY id_categoria ASC");
            
            // Mapeamos snake_case (BD) a PascalCase (Modelo)
            return rows.map(row => this._mapRowToModel(row));
        } catch (err) {
            console.error("Error obteniendo categorias: ", err.message);
            throw err;
        }
    }

    async getCategoriaNombre(NombreC) {
        try {
            await ensureCategoriaSchema();

            const termino = (NombreC || '').toString().trim();
            if (!termino) return null;

            // Búsqueda parcial (case-insensitive)
            const { rows } = await pool.query(
                "SELECT * FROM categorias WHERE nombre ILIKE $1 ORDER BY id_categoria ASC",
                [`%${termino}%`]
            );
            
            if (rows.length === 0) return null;
            
            // Si hay resultados, los mapeamos
            return rows.map(row => this._mapRowToModel(row));
        } catch (err) {
            console.error("Error obteniendo categorias por nombre: ", err.message);
            throw err;
        }
    }

    async postCategoria(nombre, clasificacion, imagenUrl = undefined) { 
        if (!nombre) {
            throw new Error("El nombre de la categoria es obligatorio.");
        }
        
        try {
            await ensureCategoriaSchema();

            const hasClasificacion = clasificacion !== undefined && clasificacion !== null && String(clasificacion).trim() !== '';
            const hasImagen = imagenUrl !== undefined;

            // INSERT con RETURNING para obtener el ID generado
            // `clasificacion` en BD es NOT NULL, pero tiene DEFAULT. Si no mandan nada, usamos DEFAULT.
            let query = "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id_categoria";
            let values = [nombre];

            if (hasClasificacion && hasImagen) {
                query = "INSERT INTO categorias (nombre, clasificacion, imagen_url) VALUES ($1, $2, $3) RETURNING id_categoria";
                values = [nombre, clasificacion, imagenUrl ?? null];
            } else if (hasClasificacion) {
                query = "INSERT INTO categorias (nombre, clasificacion) VALUES ($1, $2) RETURNING id_categoria";
                values = [nombre, clasificacion];
            } else if (hasImagen) {
                query = "INSERT INTO categorias (nombre, imagen_url) VALUES ($1, $2) RETURNING id_categoria";
                values = [nombre, imagenUrl ?? null];
            }

            const { rows } = await pool.query(query, values);
            
            return rows[0].id_categoria;
        } catch (err) {
            console.error("Error al registrar una nueva categoria: ", err.message);
            throw err;
        }
    }

    async getCategoryByClassification(clasificacion) {
        try {
            await ensureCategoriaSchema();
            const termino = (clasificacion || '').toString().trim();
            if (!termino) return null;

            const { rows } = await pool.query(
                "SELECT * FROM categorias WHERE clasificacion ILIKE $1 ORDER BY id_categoria ASC",
                [`%${termino}%`]
            );
            return rows.map(row => this._mapRowToModel(row));
        } catch (err) {
            console.error("Error obteniendo categorias por clasificación: ", err.message);
            throw err;
        }
    }

    async updateCategoria(id, cuerpo) {
        await ensureCategoriaSchema();

        const nombre = cuerpo?.NombreCategoria ?? cuerpo?.nombreCategoria;
        const clasificacion = cuerpo?.Clasificacion ?? cuerpo?.clasificacion;
        const imagenUrl = cuerpo?.ImagenUrl ?? cuerpo?.imagenUrl;

        const sets = [];
        const values = [];
        let idx = 1;

        if (nombre !== undefined) {
            if (String(nombre).trim() === '') {
                const error = new Error("El nombre es obligatorio para actualizar.");
                error.status = 400;
                throw error;
            }
            sets.push(`nombre = $${idx++}`);
            values.push(nombre);
        }

        if (clasificacion !== undefined) {
            if (String(clasificacion).trim() === '') {
                const error = new Error("La clasificación no puede ser vacía.");
                error.status = 400;
                throw error;
            }
            sets.push(`clasificacion = $${idx++}`);
            values.push(clasificacion);
        }

        if (imagenUrl !== undefined) {
            sets.push(`imagen_url = $${idx++}`);
            values.push(imagenUrl === null ? null : String(imagenUrl).trim() || null);
        }

        if (sets.length === 0) {
            const error = new Error("No hay campos válidos para actualizar.");
            error.status = 400;
            throw error;
        }

        try {
            const query = `UPDATE categorias SET ${sets.join(", ")} WHERE id_categoria = $${idx} RETURNING *`;
            values.push(id);

            const { rowCount, rows } = await pool.query(query, values);
            
            if (rowCount === 0) return null;

            return this._mapRowToModel(rows[0]);
        } catch (err) {
            console.error("Error al actualizar la categoria: ", err.message);
            throw err;
        }
    }

    async deleteCategoria(id) {
        try {
            await ensureCategoriaSchema();
            // VALIDACIÓN: Verificamos en la tabla 'items' (antes producto)
            const queryCheck = "SELECT 1 FROM items WHERE id_categoria = $1 LIMIT 1";
            const { rowCount: hayItems } = await pool.query(queryCheck, [id]);

            if (hayItems > 0) {
                const error = new Error("Imposible borrar la categoria, hay items/productos relacionados.");
                error.status = 400;
                throw error;
            } 
            
            // Si está libre, borramos
            const { rowCount } = await pool.query("DELETE FROM categorias WHERE id_categoria = $1", [id]);
            return { affectedRows: rowCount };
            
        } catch (err) {
            console.error("Error al eliminar la categoria: ", err.message);
            throw err;
        }
    }

    async getCategoriaById(id) {
        await ensureCategoriaSchema();
        const { rows } = await pool.query("SELECT * FROM categorias WHERE id_categoria = $1 LIMIT 1", [id]);
        if (rows.length === 0) return null;
        return this._mapRowToModel(rows[0]);
    }

    async setImagenUrl(idCategoria, imagenUrl) {
        await ensureCategoriaSchema();
        const { rowCount, rows } = await pool.query(
            "UPDATE categorias SET imagen_url = $1 WHERE id_categoria = $2 RETURNING *",
            [imagenUrl, idCategoria]
        );
        if (rowCount === 0) throw new Error("Categoría no encontrada.");
        return this._mapRowToModel(rows[0]);
    }
}

module.exports = new CategoriaService();