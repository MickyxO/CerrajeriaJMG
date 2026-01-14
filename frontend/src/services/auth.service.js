
import { apiRequest } from "./api";

export const authService = {
	/**
	 * Backend: POST /login
	 * Body: { username: string, pin: string }
	 */
	login(username, pin) {
		return apiRequest("/login", { method: "POST", body: { username, pin } });
	},
};

