export const IMAGE_VARIANTS = Object.freeze({
	THUMB: "thumb",
	PREVIEW: "preview",
	ZOOM: "zoom",
});

/**
 * Resuelve una URL de imagen para la intranet local:
 * - Si es ruta relativa tipo /uploads/items/x.jpg, la convierte a absoluta usando apiBaseUrl.
 * - Si es URL absoluta (ej. imágenes históricas o externas), la devuelve directamente.
 */
export function resolveImageUrl(raw, { apiBaseUrl } = {}) {
	const value = (raw ?? "").toString().trim();
	if (!value) return null;

	// URLs absolutas (http/https)
	if (/^https?:\/\//i.test(value)) {
		return value;
	}

	// Rutas relativas locales (/uploads/...)
	if (!apiBaseUrl) return value;
	const normalized = value.replace(/\\/g, "/");
	try {
		return new URL(normalized, apiBaseUrl).toString();
	} catch {
		return value;
	}
}
