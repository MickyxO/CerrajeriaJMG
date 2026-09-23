const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const SwaggerSpeci = require("./swagger/swaggerspecification");

const categoriaRoutes = require("./routes/categoria/categoria.routes");
const itemsRoutes = require("./routes/items/items.routes");
const ventaRoutes = require("./routes/venta/venta.routes");
const cajaRoutes = require("./routes/caja/caja.routes");
const usuariosRoutes = require("./routes/usuarios/usuarios.routes");
const inventarioRoutes = require("./routes/inventario/inventario.routes");
const reportesRoutes = require("./routes/reportes/reportes.routes");
const CajaService = require("./services/caja/caja.service");

const app = express();

// Intranet: CORS abierto para permitir acceso desde cualquier dispositivo en la red local (WiFi/LAN)
app.use(cors());
app.use(express.json());

// Servir archivos estáticos locales (imágenes subidas) directamente desde disco
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, server: "CerrajeriaJMG POS Local" });
});

// Rutas de la aplicación
app.use("/", categoriaRoutes);
app.use("/", itemsRoutes);
app.use("/", ventaRoutes);
app.use("/", cajaRoutes);
app.use("/", usuariosRoutes);
app.use("/", inventarioRoutes);
app.use("/", reportesRoutes);

// Swagger UI local
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(SwaggerSpeci));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor POS Local corriendo en el puerto ${PORT}`);
  console.log(`📡 Accesible localmente en http://localhost:${PORT}`);

  let autoCloseRunning = false;
  const runAutoCloseCheck = async (trigger) => {
    if (autoCloseRunning) return;
    autoCloseRunning = true;
    try {
      const result = await CajaService.autoCloseOpenCajaIfNeeded();
      if (result?.closed) {
        console.log(
          `[CajaAutoClose:${trigger}] Caja #${result?.cierre?.id_caja} cerrada automáticamente (${result?.motivo}).`
        );
      }
    } catch (err) {
      console.error(`[CajaAutoClose:${trigger}] Error:`, err.message);
    } finally {
      autoCloseRunning = false;
    }
  };

  runAutoCloseCheck("startup");
  const everyMs = Math.max(30_000, Number(process.env.CAJA_AUTOCLOSE_CHECK_MS) || 60_000);
  setInterval(() => runAutoCloseCheck("interval"), everyMs);
});
