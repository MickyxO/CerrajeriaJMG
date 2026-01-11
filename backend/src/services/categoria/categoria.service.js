const pool = require("../../config/db");
const Categoria = require("../../models/categoria/categoria.model");

class CategoriaService {

    async getAllCategoria() {
        try {
            const { rows } = await pool.query("SELECT * FROM categorias ORDER BY id_categoria ASC");
            
            // Mapeamos snake_case (BD) a PascalCase (Modelo)
            return rows.map(
                row => new Categoria(row.id_categoria, row.nombre)
            );
        } catch (err) {
            console.error("Error obteniendo categorias: ", err.message);
            throw err;
        }
    }

    async getCategoriaNombre(NombreC) {
        try {

            const { rows } = await pool.query("SELECT * FROM categorias WHERE nombre = $1", [NombreC]);
            
            if (rows.length === 0) return null;
            
            // Si hay resultados, los mapeamos
            return rows.map(
                row => new Categoria(row.id_categoria, row.nombre)
            );  
        } catch (err) {
            console.error("Error obteniendo categorias por nombre: ", err.message);
            throw err;
        }
    }

    async postCategoria(nombre) { 
        if (!nombre) {
            throw new Error("El nombre de la categoria es obligatorio.");
        }
        
        try {
            // INSERT con RETURNING para obtener el ID generado
            const query = "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id_categoria";
            const { rows } = await pool.query(query, [nombre]);
            
            return rows[0].id_categoria;
        } catch (err) {
            console.error("Error al registrar una nueva categoria: ", err.message);
            throw err;
        }
    }

    async updateCategoria(id, cuerpo) {
        // Simplificado: En la nueva BD solo podemos actualizar el nombre
        if (!cuerpo.NombreCategoria || cuerpo.NombreCategoria === '') {

             const error = new Error("El nombre es obligatorio para actualizar.");
             error.status = 400;
             throw error;
        }

        try {
            const query = "UPDATE categorias SET nombre = $1 WHERE id_categoria = $2 RETURNING *";
            const values = [cuerpo.NombreCategoria, id];

            const { rowCount, rows } = await pool.query(query, values);
            
            if (rowCount === 0) return null;

            return new Categoria(rows[0].id_categoria, rows[0].nombre);
        } catch (err) {
            console.error("Error al actualizar la categoria: ", err.message);
            throw err;
        }
    }

    async deleteCategoria(id) {
        try {
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
}

module.exports = new CategoriaService();