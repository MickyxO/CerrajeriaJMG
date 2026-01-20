
import { apiRequest } from "./api";

export const authService = {
	/**
	 * Backend: POST /login
	 * Body: { username: string, pin: string }
	 * Returns: { usuario, token }
	 */
	login(username, pin) {
		return apiRequest("/login", { method: "POST", body: { username, pin } });
	},
};

