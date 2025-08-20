const CategoriaService = require("../../services/categoria/categoria.service");

class CategoriaController {
    
    async getAll(req, res) {
        try {
            const categorias = await CategoriaService.getAllCategoria();
            res.status(200).json(categorias);
        } catch (err) {
             res.status(500).json({ error: err.message });
        }
    }

    async getByName(req, res) {
        try {
            const categorias = await CategoriaService.getCategoriaNombre(req.params.nombre);
            if (!categorias) {
                return res.status(404).json({ mensaje: "Categoría no encontrada" });
            }
            res.status(200).json(categorias);
        } catch (err) {
             res.status(500).json({ error: err.message });
        }
    }

    async create(req, res) {
        try {
            const { nombreCategoria, clasificacion } = req.body;
            const id = await CategoriaService.postCategoria(nombreCategoria, clasificacion);
            res.status(201).json({ mensaje: "Categoría creada", id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const result = await CategoriaService.updateCategoria(id, req.body);
            res.status(200).json({ mensaje: "Categoría actualizada", result });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message });
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await CategoriaService.deleteCategoria(id);
            res.status(200).json({ mensaje: "Categoría eliminada", result });
        } catch (err) {
            const status = err.status || 500;
            res.status(status).json({ error: err.message });
        }
    }


}

module.exports = new CategoriaController();

