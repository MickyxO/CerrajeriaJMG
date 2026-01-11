const CombosService = require("../../services/combos/combos.service");

class CombosController {

    async getAll(req, res) {
        try {
            const combos = await CombosService.getAllCombos();
            res.status(200).json(combos);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getById(req, res) {
        try {
            const id = req.params.id;
            const combo = await CombosService.getComboById(id);
            if (!combo) {
                return res.status(404).json({ error: "Combo no encontrado" });
            }
            res.status(200).json(combo);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async create(req, res) {
        try {
            const insertId = await CombosService.createCombo(req.body);
            res.status(201).json({ message: "Combo creado exitosamente", insertId });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await CombosService.deleteCombo(id);
            res.status(200).json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new CombosController();