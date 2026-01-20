const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { requireAuth } = require("./middlewares/auth");

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

// Auth global (JWT)
// Excepciones: /health, /login, /api-docs (si aplica), /uploads (solo cuando se sirve localmente)
// y /postusuario si habilitas bootstrap con ALLOW_PUBLIC_USER_CREATE=true.
const allowPublicUserCreate = String(process.env.ALLOW_PUBLIC_USER_CREATE || "").toLowerCase() === "true";
app.use((req, res, next) => {
  const pathOnly = req.path || "";

  if (pathOnly === "/health") return next();
  if (pathOnly === "/login" && req.method === "POST") return next();
  if (pathOnly === "/postusuario" && req.method === "POST" && allowPublicUserCreate) return next();

  if (pathOnly.startsWith("/uploads")) {
    if (process.env.SERVE_LOCAL_UPLOADS === "true" || process.env.NODE_ENV !== "production") {
      return next();
    }
  }

  if (pathOnly.startsWith("/api-docs")) return next();

  return requireAuth(req, res, next);
});

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

// Swagger UI
// En producción, NO lo expongas públicamente por defecto.
// - Para habilitar: ENABLE_SWAGGER=true
// - Para proteger con usuario/clave: SWAGGER_USER / SWAGGER_PASS
const enableSwagger = String(process.env.ENABLE_SWAGGER || "").toLowerCase() === "true";
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const swaggerUser = (process.env.SWAGGER_USER || "").trim();
const swaggerPass = process.env.SWAGGER_PASS || "";

function swaggerAuth(req, res, next) {
  if (!swaggerUser || !swaggerPass) return next();

  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Basic" || !token) {
    res.setHeader("WWW-Authenticate", 'Basic realm="api-docs"');
    return res.status(401).send("Auth required");
  }

  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    res.setHeader("WWW-Authenticate", 'Basic realm="api-docs"');
    return res.status(401).send("Auth required");
  }

  const idx = decoded.indexOf(":");
  const user = idx >= 0 ? decoded.slice(0, idx) : "";
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (user !== swaggerUser || pass !== swaggerPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="api-docs"');
    return res.status(401).send("Invalid credentials");
  }

  return next();
}

if (!isProd || enableSwagger) {
  app.use("/api-docs", swaggerAuth, swaggerUi.serve, swaggerUi.setup(SwaggerSpeci));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
