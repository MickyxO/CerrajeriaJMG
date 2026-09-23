const express = require("express");
const ReportesController = require("../../controllers/reportes/reportes.controller");

const router = express.Router();

// GET /reportes/resumen-general?range=today|7d|30d|90d|365d
router.get("/reportes/resumen-general", ReportesController.resumenGeneral);

// GET /reportes/best-sellers?range=7d|30d|90d&limit=10
router.get("/reportes/best-sellers", ReportesController.bestSellers);

// GET /reportes/worst-sellers?range=7d|30d|90d&limit=10&incluyeInactivos=true
router.get("/reportes/worst-sellers", ReportesController.worstSellers);

// GET /reportes/item/:id?range=7d|30d|90d
router.get("/reportes/item/:id", ReportesController.reporteItem);

module.exports = router;
