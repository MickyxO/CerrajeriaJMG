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

const app = express();
app.use(cors()); 
app.use(express.json());

// Archivos subidos (imágenes)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use("/", categoriaRoutes);
app.use("/", itemsRoutes);
app.use("/", ventaRoutes);
app.use("/", combosRoutes);
app.use("/", cajaRoutes);
app.use("/", usuariosRoutes);
app.use("/", inventarioRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(SwaggerSpeci));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
