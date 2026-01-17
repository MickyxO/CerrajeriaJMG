const InventarioService = require("../../services/inventario/inventario.service");

class InventarioController {
  async getMovimientos(req, res) {
    try {
      const { idItem, fechaInicio, fechaFin, limit } = req.query;
      const movimientos = await InventarioService.getMovimientos({
        idItem,
        fechaInicio,
        fechaFin,
        limit,
      });
      return res.status(200).json(movimientos);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async ajustarStock(req, res) {
    try {
      const result = await InventarioService.ajustarStock(req.body);
      return res.status(200).json({ message: "Stock ajustado", result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new InventarioController();
