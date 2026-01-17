const ItemsService = require("../../services/items/items.service");

function parseBool(value) {
    if (value === true || value === false) return value;
    const s = String(value ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
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
}

module.exports = new ItemsController();