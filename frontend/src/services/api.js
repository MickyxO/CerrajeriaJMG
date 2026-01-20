const DEFAULT_API_URL = "http://localhost:3000";

export const API_URL = (import.meta.env?.VITE_API_URL || DEFAULT_API_URL).replace(
	/\/$/,
	""
);

function getStoredToken() {
	try {
		return localStorage.getItem("softsmith.token") || null;
	} catch {
		return null;
	}
}

function buildUrl(path, params) {
	const url = new URL(path, API_URL);

	if (params && typeof params === "object") {
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === null || value === "") return;
			url.searchParams.set(key, String(value));
		});
	}

	return url.toString();
}

async function parseResponse(response) {
	const contentType = response.headers.get("content-type") || "";
	const isJson = contentType.includes("application/json");

	if (isJson) {
		return await response.json();
	}

	const text = await response.text();
	return text ? { message: text } : null;
}

export async function apiRequest(
	path,
	{ method = "GET", params, body, headers } = {}
) {
	const url = buildUrl(path, params);
	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
	const token = getStoredToken();

	const response = await fetch(url, {
		method,
		headers: {
			...(isFormData ? {} : { "Content-Type": "application/json" }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(headers || {}),
		},
		body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
	});

	const data = await parseResponse(response);

	if (!response.ok) {
		const message =
			(data && (data.message || data.error)) ||
			`HTTP ${response.status} ${response.statusText}`;
		const error = new Error(message);
		error.status = response.status;
		error.data = data;
		throw error;
	}

	return data;
}

