const ItemsService = require("../../services/items/items.service");

class ItemsController {
    async getAll(req, res) {
        try {
            const items = await ItemsService.getAllItems();
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByCategoria(req, res) {
        try {
            const items = await ItemsService.getItemsPorCategoria(req.params.idCategoria);
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByMarca(req, res) {
        try {
            // Nota: en BD es `compatibilidad_marca` (texto). La ruta usa :idMarca,
            // pero aquí se interpreta como nombre/fragmento de marca.
            const marca = req.params.nombreMarca ?? req.params.idMarca;
            const items = await ItemsService.getItemsPorMarca(marca);
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async searchByNombre(req, res) {
        try {
            const items = await ItemsService.getItemsPorNombreParcial(req.query.q || "");
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
}

module.exports = new ItemsController();