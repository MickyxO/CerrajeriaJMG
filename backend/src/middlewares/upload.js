const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { isCloudinaryConfigured } = require("../config/cloudinary");

const ITEMS_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/items");
const CATEGORIES_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/categorias");
// Solo tiene sentido crear carpeta si vamos a guardar en disco.
if (!isCloudinaryConfigured) {
  fs.mkdirSync(ITEMS_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(CATEGORIES_UPLOAD_DIR, { recursive: true });
}

function makeSafeFilename(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  const rand = Math.random().toString(16).slice(2);
  return `${Date.now()}-${rand}${ext || ""}`;
}

function makeDiskStorage(dirPath) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      cb(null, makeSafeFilename(file.originalname));
    },
  });
}

const itemStorage = isCloudinaryConfigured ? multer.memoryStorage() : makeDiskStorage(ITEMS_UPLOAD_DIR);
const categoryStorage = isCloudinaryConfigured ? multer.memoryStorage() : makeDiskStorage(CATEGORIES_UPLOAD_DIR);

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Formato no permitido. Usa JPG, PNG o WEBP."), false);
  }
  cb(null, true);
};

const uploadItemImage = multer({
  storage: itemStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = {
  uploadItemImage,
  uploadCategoryImage,
  ITEMS_UPLOAD_DIR,
  CATEGORIES_UPLOAD_DIR,
};
