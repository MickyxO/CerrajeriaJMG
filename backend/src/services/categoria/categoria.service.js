const pool = require("../../config/db");
const Categoria = require("../../models/categoria/categoria.model")

class CategoriaService {

    async getAllCategoria() {
        try {
            const [rows] = await pool.query("SELECT * FROM categoria");
            return rows.map(
                row => new Categoria(row.IdCategoria, row.NombreCategoria, row.Clasificacion)
            );
        } catch (err) {
            console.error("Error obteniendo categorias: ", err.message);
            throw err;
        }
    }

    async getCategoriaNombre(NombreC) {
        try {
            const [rows] = await pool.query("SELECT * FROM categoria WHERE NombreCategoria = ?", [NombreC]);
            if (rows.length == 0) return null;
            if (rows.length > 1) {
                return rows.map(
                    row => new Categoria(row.IdCategoria, row.NombreCategoria, row.Clasificacion)
                );  
            } else {
                const row = rows[0];
                return new Categoria(row.IdCategoria, row.NombreCategoria, row.Clasificacion);
            }
        } catch (err) {
            console.error("Error obteniendo categorias por nombre. ", err.message);
            throw err;
        }
    }

    async postCategoria (nombre, clasificacion) {
        const validClasificaciones = ['Automotriz', 'Residencial'];
        if (!validClasificaciones.includes(clasificacion)) {
            const error = new Error("Clasificacion inválida. Debe ser 'Automotriz' o 'Residencial'.");
            error.status = 400;
            throw error;
        }
        try {
            const [result] = await pool.query(
                "INSERT INTO CATEGORIA (NombreCategoria, Clasificacion) VALUES (?, ?)",
                [nombre, clasificacion]
            );
        } catch (err) {
            console.error("Error al registrar una nueva categoria.", err.message);
            throw err;
        }
    }

    async updateCategoria(id, cuerpo) {
        const camposActualizables = ['NombreCategoria', 'Clasificacion'];
        const validClasificaciones = ['Automotriz', 'Residencial'];
        const datosActualizar = {};

        for (let campo of camposActualizables) {
            if (cuerpo[campo] !== undefined && cuerpo[campo] !== '') {
                datosActualizar[campo] = cuerpo[campo];
            }
        }

        if (datosActualizar['Clasificacion']) {
            if (!validClasificaciones.includes(datosActualizar['Clasificacion'])){
                const error = new Error("Clasificacion inválida. Debe ser 'Automotriz' o 'Residencial'.");
                error.status = 400;
                throw error;
            }
        }

        if (Object.keys(datosActualizar).length === 0) {
            const error = new Error("No hay campos válidos para actualizar.");
            error.status = 400;
            throw error;
        }

        const setClause = Object.keys(datosActualizar)
            .map(campo => `${campo} = ?`)
            .join(', ');
        const values = Object.values(datosActualizar);
        values.push(id); 

        try {
            const [result] = await pool.query(
                `UPDATE CATEGORIA SET ${setClause} WHERE IdCategoria = ?`,
                values
            );
            return result;
        } catch (err) {
            console.error("Error al actualizar la categoria.", err.message);
            throw err;
        }
    }

    async deleteCategoria(id) {
        try {
            const [productos] = await pool.query(`SELECT * FROM producto p INNER JOIN categoria c ON p.IdCategoria = c.IdCategoria 
                WHERE c.IdCategoria = ?`, [id]);
            if (productos.length > 0) {
                const error = new Error("Imposible borrar la categoria, hay productos relacionados. ");
                error.status = 400;
                throw error;
            } else {
                const [result] = await pool.query("DELETE FROM categoria WHERE IdCategoria = ?", [id]);
                return result;
            }
        } catch (err) {
            console.error("Error al eliminar la categoria.", err.message);
            throw err;
        }
    }

}

module.exports = new CategoriaService();