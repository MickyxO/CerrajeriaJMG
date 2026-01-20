
import { useCallback, useMemo, useState } from "react";
import { authService } from "../services/auth.service";
import { AuthContext } from "./authContext";

const STORAGE_USER_KEY = "softsmith.user";
const STORAGE_TOKEN_KEY = "softsmith.token";

function loadStoredUser() {
	try {
		const raw = localStorage.getItem(STORAGE_USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function loadStoredToken() {
	try {
		return localStorage.getItem(STORAGE_TOKEN_KEY) || null;
	} catch {
		return null;
	}
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => loadStoredUser());
	const [token, setToken] = useState(() => loadStoredToken());
	const [isLoading, setIsLoading] = useState(false);

	const login = useCallback(async (username, password) => {
		setIsLoading(true);
		try {
			const response = await authService.login(username, password);
			const nextUser = response?.usuario ?? null;
			const nextToken = response?.token ?? null;
			setUser(nextUser);
			setToken(nextToken);

			try {
				localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
				if (nextToken) {
					localStorage.setItem(STORAGE_TOKEN_KEY, String(nextToken));
				} else {
					localStorage.removeItem(STORAGE_TOKEN_KEY);
				}
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
		setToken(null);
		try {
			localStorage.removeItem(STORAGE_USER_KEY);
			localStorage.removeItem(STORAGE_TOKEN_KEY);
		} catch {
			// ignore storage errors
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			token,
			isAuthenticated: Boolean(user && token),
			isLoading,
			login,
			logout,
		}),
		[user, token, isLoading, login, logout]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

