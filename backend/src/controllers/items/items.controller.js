const ItemsService = require("../../services/items/items.service");
const path = require("path");
const fs = require("fs");
const { ITEMS_UPLOAD_DIR } = require("../../middlewares/upload");

function parseBool(value) {
    if (value === true || value === false) return value;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
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
    async getPosCatalog(req, res) {
        try {
            const includeItemsRaw = req.query?.incluyeItems;
            const includeServiciosRaw = req.query?.incluyeServicios;

            const incluyeItems = includeItemsRaw === undefined ? true : parseBool(includeItemsRaw);
            const incluyeServicios = includeServiciosRaw === undefined ? true : parseBool(includeServiciosRaw);

            const data = await ItemsService.getPosCatalogo({
                q: req.query?.q || "",
                idCategoria: req.query?.idCategoria || null,
                incluyeItems,
                incluyeServicios,
                soloConStock: parseBool(req.query?.soloConStock),
                limit: req.query?.limit,
            });

            return res.status(200).json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

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

            const imagenUrl = `/uploads/items/${req.file.filename}`;
            const result = await ItemsService.setImagenUrl(id, imagenUrl);

            res.status(200).json({ message: "Imagen actualizada correctamente", result });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async deleteImagen(req, res) {
        try {
            const raw = req.params.id;
            const id = Number(raw);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "ID inválido." });
            }

            const item = await ItemsService.getItemById(id, { incluyeInactivos: true });
            if (!item) {
                return res.status(404).json({ error: "Item no encontrado." });
            }

            const currentUrl = item?.ImagenUrl || null;
            let storageDeleted = false;
            let storageWarning = null;

            if (currentUrl && String(currentUrl).startsWith("/uploads/items/")) {
                const filename = String(currentUrl).split("/uploads/items/")[1] || "";
                const abs = path.resolve(ITEMS_UPLOAD_DIR, filename);

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

            const result = await ItemsService.setImagenUrl(id, null);
            return res.status(200).json({ message: "Imagen eliminada correctamente", result, storageDeleted, storageWarning });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new ItemsController();