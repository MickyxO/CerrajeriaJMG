const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const SwaggerSpeci = require("./swagger/swaggerspecification");

const categoriaRoutes = require("./routes/categoria/categoria.routes");
const itemsRoutes = require("./routes/items/items.routes");
const ventaRoutes = require("./routes/venta/venta.routes");
const combosRoutes = require("./routes/combos/combos.routes");
const cajaRoutes = require("./routes/caja/caja.routes");
const usuariosRoutes = require("./routes/usuarios/usuarios.routes");
const inventarioRoutes = require("./routes/inventario/inventario.routes");
const reportesRoutes = require("./routes/reportes/reportes.routes");

const app = express();

const corsOrigin = (process.env.CORS_ORIGIN || "").trim();
if (corsOrigin) {
  app.use(
    cors({
      origin: corsOrigin.split(",").map((s) => s.trim()),
    })
  );
} else {
  // Dev/local: CORS abierto
  app.use(cors());
}
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Archivos subidos (imágenes)
// En producción se recomienda Cloudinary (no disco local). Si necesitas servir uploads locales,
// activa SERVE_LOCAL_UPLOADS=true.
if (process.env.SERVE_LOCAL_UPLOADS === "true" || process.env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
}

app.use("/", categoriaRoutes);
app.use("/", itemsRoutes);
app.use("/", ventaRoutes);
app.use("/", combosRoutes);
app.use("/", cajaRoutes);
app.use("/", usuariosRoutes);
app.use("/", inventarioRoutes);
app.use("/", reportesRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(SwaggerSpeci));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
