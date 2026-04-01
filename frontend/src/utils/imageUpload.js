function inferExtensionFromType(type) {
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "img";
}

function buildOptimizedName(originalName, type) {
  const cleanName = String(originalName || "imagen").trim();
  const dot = cleanName.lastIndexOf(".");
  const base = dot > 0 ? cleanName.slice(0, dot) : cleanName;
  const ext = inferExtensionFromType(type);
  return `${base}-opt.${ext}`;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen para optimizar."));
    };

    img.src = url;
  });
}

function canvasToBlob(canvas, outputType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), outputType, quality);
  });
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export async function optimizeImageForUpload(
  file,
  {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
    outputType = "image/webp",
    minSavingsBytes = 24 * 1024,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error("Archivo de imagen inválido.");
  }

  const type = String(file.type || "").toLowerCase();
  if (!type.startsWith("image/")) {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  // No recomprimir formatos donde no aporta (animación/vectorial).
  if (type === "image/gif" || type === "image/svg+xml") {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  const img = await loadImageElement(file);
  const srcW = Number(img.naturalWidth || img.width || 0);
  const srcH = Number(img.naturalHeight || img.height || 0);

  if (!srcW || !srcH) {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  const ratio = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
  const targetW = Math.max(1, Math.round(srcW * ratio));
  const targetH = Math.max(1, Math.round(srcH * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await canvasToBlob(canvas, outputType, quality);
  if (!blob) {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  // Si no ahorra tamaño suficiente, usamos original.
  if (blob.size + minSavingsBytes >= file.size) {
    return { file, changed: false, originalSize: file.size, optimizedSize: file.size };
  }

  const optimizedFile = new File([blob], buildOptimizedName(file.name, blob.type), {
    type: blob.type,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    changed: true,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
  };
}
