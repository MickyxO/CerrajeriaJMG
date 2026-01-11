const VentaService = require("../../services/venta/venta.service");

class VentaController {
    async getAll(req, res) {
        try {
            const ventas = await VentaService.getAllVentas();
            res.status(200).json(ventas);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByClienteName(req, res) {
        try {
            const ventas = await VentaService.getVentaPorNombreCliente(req.query.q || "");
            res.status(200).json(ventas);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getByFecha(req, res) {
        try {
            const ventas = await VentaService.getVentaPorFecha(req.query.fecha);
            res.status(200).json(ventas);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async create(req, res) {
        try {
            const insertId = await VentaService.postVenta(req.body);
            res.status(201).json({ message: "Venta registrada exitosamente", insertId });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const result = await VentaService.updateVenta(id, req.body);
            res.status(200).json({ message: "Venta actualizada exitosamente", result });
        } catch (err) {
            res.status(err.status || 400).json({ error: err.message });
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await VentaService.deleteVenta(id);
            res.status(200).json({ message: "Venta eliminada exitosamente", result });
        } catch (err) {
            res.status(err.status || 400).json({ error: err.message });
        }
    }
}

module.exports = new VentaController();