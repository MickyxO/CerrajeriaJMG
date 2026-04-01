const CategoriaService = require("../../services/categoria/categoria.service");
const path = require("path");
const fs = require("fs");

const { cloudinary, isCloudinaryConfigured } = require("../../config/cloudinary");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");
const { CATEGORIES_UPLOAD_DIR } = require("../../middlewares/upload");

function isLikelyCloudinaryUrl(url) {
    const s = String(url || "");
    return s.includes("cloudinary.com/");
}

function extractCloudinaryPublicIdFromUrl(url) {
    try {
        const u = new URL(String(url));
        const parts = (u.pathname || "").split("/").filter(Boolean);
        const uploadIdx = parts.indexOf("upload");
        if (uploadIdx < 0) return null;

        const afterUpload = parts.slice(uploadIdx + 1);
        const vIdx = afterUpload.findIndex((p) => /^v\d+$/.test(p));
        const idParts = (vIdx >= 0 ? afterUpload.slice(vIdx + 1) : afterUpload).filter(Boolean);
        if (idParts.length === 0) return null;

        const last = idParts[idParts.length - 1];
        idParts[idParts.length - 1] = last.replace(/\.[a-z0-9]+$/i, "");
        return decodeURIComponent(idParts.join("/"));
    } catch {
        return null;
    }
}

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
            const nombreCategoria = req.body?.nombreCategoria ?? req.body?.NombreCategoria;
            const clasificacion = req.body?.clasificacion ?? req.body?.Clasificacion;
            const imagenUrl = req.body?.imagenUrl ?? req.body?.ImagenUrl;
            const id = await CategoriaService.postCategoria(nombreCategoria, clasificacion, imagenUrl);
            res.status(201).json({ mensaje: "Categoría creada", id });
        } catch (err) {
            // Errores típicos: validación/NOT NULL -> 400
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

            let imagenUrl;

            if (isCloudinaryConfigured) {
                if (!req.file.buffer) {
                    return res.status(400).json({ error: "No se recibió contenido del archivo." });
                }

                const resultUpload = await uploadBufferToCloudinary(req.file.buffer, {
                    folder: "softsmith/categorias",
                });

                imagenUrl = resultUpload.secure_url;
            } else {
                imagenUrl = `/uploads/categorias/${req.file.filename}`;
            }

            const result = await CategoriaService.setImagenUrl(id, imagenUrl);
            return res.status(200).json({ message: "Imagen de categoría actualizada correctamente", result });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    async uploadImagenDesdeUrl(req, res) {
        try {
            const raw = req.params.id;
            const id = Number(raw);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const url = String(req.body?.url || "").trim();
            if (!url) {
                return res.status(400).json({ error: "Debe enviar una url." });
            }

            if (!/^https?:\/\//i.test(url)) {
                return res.status(400).json({ error: "La url debe iniciar con http(s)." });
            }

            if (!isCloudinaryConfigured) {
                return res.status(400).json({ error: "Esta función requiere Cloudinary configurado." });
            }

            const resultUpload = await cloudinary.uploader.upload(url, {
                folder: "softsmith/categorias",
                resource_type: "image",
            });

            const imagenUrl = resultUpload?.secure_url;
            if (!imagenUrl) {
                return res.status(400).json({ error: "No se pudo obtener la URL de Cloudinary." });
            }

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

            if (currentUrl) {
                if (isCloudinaryConfigured && isLikelyCloudinaryUrl(currentUrl)) {
                    const publicId = extractCloudinaryPublicIdFromUrl(currentUrl);
                    if (publicId) {
                        try {
                            const r = await cloudinary.uploader.destroy(publicId, {
                                resource_type: "image",
                                invalidate: true,
                            });
                            storageDeleted = r?.result === "ok" || r?.result === "not found";
                            if (r?.result && r.result !== "ok" && r.result !== "not found") {
                                storageWarning = `Cloudinary destroy result: ${r.result}`;
                            }
                        } catch (e) {
                            storageWarning = e?.message || "No se pudo eliminar en Cloudinary.";
                        }
                    }
                } else if (String(currentUrl).startsWith("/uploads/categorias/")) {
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
            }

            const result = await CategoriaService.setImagenUrl(id, null);
            return res.status(200).json({ message: "Imagen de categoría eliminada", result, storageDeleted, storageWarning });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }


}

module.exports = new CategoriaController();

