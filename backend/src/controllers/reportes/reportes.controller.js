const ReportesService = require("../../services/reportes/reportes.service");

class ReportesController {
  async bestSellers(req, res) {
    try {
      const { range, limit } = req.query || {};
      const result = await ReportesService.getBestSellers({ range, limit });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async worstSellers(req, res) {
    try {
      const { range, limit, incluyeInactivos } = req.query || {};
      const result = await ReportesService.getWorstSellers({ range, limit, incluyeInactivos });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async reporteItem(req, res) {
    try {
      const { id } = req.params;
      const { range } = req.query || {};
      const result = await ReportesService.getReporteItem(id, { range });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ReportesController();
