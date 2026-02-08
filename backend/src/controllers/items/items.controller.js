const ItemsService = require("../../services/items/items.service");
const path = require("path");
const fs = require("fs");

const { cloudinary, isCloudinaryConfigured } = require("../../config/cloudinary");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");
const { ITEMS_UPLOAD_DIR } = require("../../middlewares/upload");

function parseBool(value) {
    if (value === true || value === false) return value;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
}

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

        // Parte después de /upload/ puede incluir transformaciones y un segmento v123.
        // Nos quedamos con lo que viene después de v{digits}/ si existe.
        const afterUpload = parts.slice(uploadIdx + 1);
        const vIdx = afterUpload.findIndex((p) => /^v\d+$/.test(p));
        const idParts = (vIdx >= 0 ? afterUpload.slice(vIdx + 1) : afterUpload).filter(Boolean);
        if (idParts.length === 0) return null;

        // Elimina extensión del último segmento (ej. .jpg)
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

class ItemsController {
    async getAll(req, res) {
        try {
            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const items = await ItemsService.getAllItems({ incluyeInactivos });
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByCategoria(req, res) {
        try {
            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const items = await ItemsService.getItemsPorCategoria(req.params.idCategoria, { incluyeInactivos });
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByMarca(req, res) {
        try {
            // Nota: en BD es `compatibilidad_marca` (texto). La ruta usa :idMarca,
            // pero aquí se interpreta como nombre/fragmento de marca.
            const marca = req.params.marca ?? req.params.nombreMarca ?? req.params.idMarca;
            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const items = await ItemsService.getItemsPorMarca(marca, { incluyeInactivos });
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async searchByNombre(req, res) {
        try {
            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const items = await ItemsService.getItemsPorNombreParcial(req.query.q || "", { incluyeInactivos });
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByClasificacion(req, res) {
        try {
            const clasificacion = req.params.clasificacion ?? req.query.clasificacion ?? "";
            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const items = await ItemsService.getItemsPorClasificacion(clasificacion, { incluyeInactivos });
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getById(req, res) {
        try {
            const raw = req.params.id;
            const id = Number(raw);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const incluyeInactivos = parseBool(req.query?.incluyeInactivos);
            const item = await ItemsService.getItemById(id, { incluyeInactivos });

            if (!item) {
                return res.status(404).json({ error: "Item no encontrado." });
            }

            return res.status(200).json(item);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    async create(req, res) {
        try {
            const insertId = await ItemsService.createItem(req.body);
            res.status(201).json({ message: "Item creado exitosamente", insertId });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const result = await ItemsService.updateItem(id, req.body);
            res.status(200).json({ message: "Item actualizado exitosamente", result });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await ItemsService.deleteItem(id);
            res.status(200).json({ message: "Item eliminado exitosamente", result });
        } catch (err) {
            res.status(400).json({ error: err.message });
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
                    folder: "softsmith/items",
                    // Opcional: si quieres que reemplazar la imagen mantenga el mismo public_id
                    // publicId: `item-${id}`,
                });

                imagenUrl = resultUpload.secure_url;
            } else {
                // Modo desarrollo/local: guardar en disco y exponerlo por /uploads
                imagenUrl = `/uploads/items/${req.file.filename}`;
            }

            const result = await ItemsService.setImagenUrl(id, imagenUrl);

            res.status(200).json({ message: "Imagen actualizada correctamente", result });
        } catch (err) {
            res.status(400).json({ error: err.message });
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

            // Subida remota: Cloudinary descarga el archivo desde la URL.
            const resultUpload = await cloudinary.uploader.upload(url, {
                folder: "softsmith/items",
                resource_type: "image",
            });

            const imagenUrl = resultUpload?.secure_url;
            if (!imagenUrl) {
                return res.status(400).json({ error: "No se pudo obtener la URL de Cloudinary." });
            }

            const result = await ItemsService.setImagenUrl(id, imagenUrl);
            return res.status(200).json({ message: "Imagen actualizada correctamente", result });
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

            // Incluye inactivos: si un item está desactivado, igual puede tener imagen.
            const item = await ItemsService.getItemById(id, { incluyeInactivos: true });
            if (!item) {
                return res.status(404).json({ error: "Item no encontrado." });
            }

            const currentUrl = item?.ImagenUrl || null;

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
                    } else {
                        storageWarning = "No se pudo determinar el public_id de Cloudinary desde la URL.";
                    }
                } else if (String(currentUrl).startsWith("/uploads/items/")) {
                    const filename = String(currentUrl).split("/uploads/items/")[1] || "";
                    const abs = path.resolve(ITEMS_UPLOAD_DIR, filename);

                    // Defensa: evita borrar fuera del directorio de uploads.
                    if (!abs.startsWith(ITEMS_UPLOAD_DIR)) {
                        storageWarning = "Ruta de archivo inválida.";
                    } else {
                        try {
                            storageDeleted = await safeUnlink(abs);
                        } catch (e) {
                            storageWarning = e?.message || "No se pudo eliminar el archivo local.";
                        }
                    }
                }
            }

            const result = await ItemsService.setImagenUrl(id, null);
            return res.status(200).json({ message: "Imagen eliminada correctamente", result, storageDeleted, storageWarning });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new ItemsController();