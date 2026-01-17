
import { useCallback, useMemo, useState } from "react";
import { authService } from "../services/auth.service";
import { AuthContext } from "./authContext";

const STORAGE_KEY = "softsmith.user";

function loadStoredUser() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => loadStoredUser());
	const [isLoading, setIsLoading] = useState(false);

	const login = useCallback(async (username, password) => {
		setIsLoading(true);
		try {
			const response = await authService.login(username, password);
			const nextUser = response?.usuario ?? null;
			setUser(nextUser);

			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
			} catch {
				// ignore storage errors
			}

			return nextUser;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const logout = useCallback(() => {
		setUser(null);
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore storage errors
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			isAuthenticated: Boolean(user),
			isLoading,
			login,
			logout,
		}),
		[user, isLoading, login, logout]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

