const CategoriaService = require("../../services/categoria/categoria.service");
const path = require("path");
const fs = require("fs");
const { CATEGORIES_UPLOAD_DIR } = require("../../middlewares/upload");

async function safeUnlink(absPath) {
    try {
        await fs.promises.unlink(absPath);
        return true;
    } catch (e) {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return false;
        throw e;
    }
}

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
            const nombreCategoria = req.body?.nombreCategoria ?? req.body?.NombreCategoria ?? req.body?.Nombre ?? req.body?.nombre;
            const clasificacion = req.body?.clasificacion ?? req.body?.Clasificacion;
            const imagenUrl = req.body?.imagenUrl ?? req.body?.ImagenUrl ?? req.body?.imagen_url;
            const id = await CategoriaService.postCategoria(nombreCategoria, clasificacion, imagenUrl);
            res.status(201).json({ mensaje: "Categoría creada", id });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async getByClassification(req, res) {
        try {
            const clasificacion = req.params.clasificacion;
            const categorias = await CategoriaService.getCategoryByClassification(clasificacion);
            if (!categorias) {
                return res.status(404).json({ mensaje: "Categoría no encontrada" });
            }
            res.status(200).json(categorias);
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

    async uploadImagen(req, res) {
        try {
            const id = req.params.id;
            if (!req.file) {
                return res.status(400).json({ error: "No se recibió archivo de imagen." });
            }

            const imagenUrl = `/uploads/categorias/${req.file.filename}`;
            const result = await CategoriaService.setImagenUrl(id, imagenUrl);
            return res.status(200).json({ message: "Imagen de categoría actualizada correctamente", result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    async deleteImagen(req, res) {
        try {
            const raw = req.params.id;
            const id = Number(raw);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const categoria = await CategoriaService.getCategoriaById(id);
            if (!categoria) {
                return res.status(404).json({ error: "Categoría no encontrada." });
            }

            const currentUrl = categoria?.ImagenUrl || null;
            let storageDeleted = false;
            let storageWarning = null;

            if (currentUrl && String(currentUrl).startsWith("/uploads/categorias/")) {
                const filename = String(currentUrl).split("/uploads/categorias/")[1] || "";
                const abs = path.resolve(CATEGORIES_UPLOAD_DIR, filename);
                if (abs.startsWith(CATEGORIES_UPLOAD_DIR)) {
                    try {
                        storageDeleted = await safeUnlink(abs);
                    } catch (e) {
                        storageWarning = e?.message || "No se pudo eliminar el archivo local.";
                    }
                }
            }

            const result = await CategoriaService.setImagenUrl(id, null);
            return res.status(200).json({ message: "Imagen de categoría eliminada", result, storageDeleted, storageWarning });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new CategoriaController();
