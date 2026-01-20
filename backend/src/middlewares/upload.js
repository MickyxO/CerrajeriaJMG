const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { isCloudinaryConfigured } = require("../config/cloudinary");

const ITEMS_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/items");
// Solo tiene sentido crear carpeta si vamos a guardar en disco.
if (!isCloudinaryConfigured) {
  fs.mkdirSync(ITEMS_UPLOAD_DIR, { recursive: true });
}

function makeSafeFilename(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  const rand = Math.random().toString(16).slice(2);
  return `${Date.now()}-${rand}${ext || ""}`;
}

const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, ITEMS_UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        cb(null, makeSafeFilename(file.originalname));
      },
    });

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Formato no permitido. Usa JPG, PNG o WEBP."), false);
  }
  cb(null, true);
};

const uploadItemImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = {
  uploadItemImage,
  ITEMS_UPLOAD_DIR,
};
