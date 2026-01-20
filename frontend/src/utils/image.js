const CLOUDINARY_UPLOAD_SEGMENT = "/upload/";

const VARIANTS = {
	thumb: "f_auto,q_auto,w_64,h_64,c_fill,g_auto",
	preview: "f_auto,q_auto,w_512,c_fit",
	zoom: "f_auto,q_auto,w_1200,c_fit",
};

function looksLikeCloudinaryUrl(url) {
	return /(^|\.)res\.cloudinary\.com\//i.test(url) && url.includes(CLOUDINARY_UPLOAD_SEGMENT);
}

function hasCloudinaryTransformAfterUpload(url) {
	const idx = url.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
	if (idx < 0) return false;
	const after = url.slice(idx + CLOUDINARY_UPLOAD_SEGMENT.length);
	const first = after.split("/")[0] || "";
	// Heurística: si el primer segmento contiene parámetros típicos (w_,h_,c_,q_,f_,g_) asumimos que ya hay transform.
	return /(^|,)(w|h|c|q|f|g)_[^/]+/i.test(first);
}

function addCloudinaryTransform(url, transform) {
	if (!transform) return url;
	const idx = url.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
	if (idx < 0) return url;

	if (hasCloudinaryTransformAfterUpload(url)) {
		// Ya viene transformada; evitamos apilar transforms para no multiplicar variantes.
		return url;
	}

	const before = url.slice(0, idx + CLOUDINARY_UPLOAD_SEGMENT.length);
	const after = url.slice(idx + CLOUDINARY_UPLOAD_SEGMENT.length);
	return `${before}${transform}/${after}`;
}

/**
 * Resuelve una URL de imagen para la app:
 * - Si es URL absoluta http(s), la devuelve (y si es Cloudinary, aplica transform por variante).
 * - Si es ruta relativa tipo /uploads/items/x.jpg, la convierte a absoluta usando apiBaseUrl.
 */
export function resolveImageUrl(raw, { apiBaseUrl, variant } = {}) {
	const value = (raw ?? "").toString().trim();
	if (!value) return null;

	const transform = variant ? VARIANTS[variant] : null;

	// Absolute URLs
	if (/^https?:\/\//i.test(value)) {
		if (looksLikeCloudinaryUrl(value) && transform) {
			return addCloudinaryTransform(value, transform);
		}
		return value;
	}

	// Relative path
	if (!apiBaseUrl) return null;
	const normalized = value.replace(/\\/g, "/");
	try {
		const absolute = new URL(normalized, apiBaseUrl).toString();
		if (looksLikeCloudinaryUrl(absolute) && transform) {
			return addCloudinaryTransform(absolute, transform);
		}
		return absolute;
	} catch {
		return null;
	}
}

export const IMAGE_VARIANTS = Object.freeze({
	THUMB: "thumb",
	PREVIEW: "preview",
	ZOOM: "zoom",
});
