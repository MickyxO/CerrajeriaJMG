require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const SwaggerSpeci = require("./swagger/swaggerspecification");

const categoriaRoutes = require("./routes/categoria/categoria.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Montar rutas
app.use("/", categoriaRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(SwaggerSpeci));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
