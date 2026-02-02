import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AUTH_ERROR_EVENT,
  FORBIDDEN_ERROR_EVENT,
  httpAuth,
  httpPublic,
} from "@/shared/api/http-client";
import { setAuthExpired } from "@/shared/auth/auth-status";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/shared/auth/token";

// Types (should be in separate types file ideally)
export interface User {
  id: number;
  username: string;
  display_name: string;
  roles: string[];
  assignments: Array<{ supplier_id: number; is_primary: boolean }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userId: number, username?: string) => Promise<void>;
  logout: (options?: { preserveAuthError?: boolean }) => void;
  authError: "expired" | "forbidden" | null;
  clearAuthError: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuthErrorListener(
  token: string | null,
  logout: (options?: { preserveAuthError?: boolean }) => void,
  setAuthError: (value: "expired" | "forbidden" | null) => void,
) {
  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      const message = customEvent.detail?.message || "セッションの有効期限が切れました";

      // Only show toast and logout if user was previously logged in
      if (token) {
        toast.error(message, {
          description: "再度ログインしてください",
          duration: 5000,
        });
        logout({ preserveAuthError: true });
        setAuthError("expired");
        setAuthExpired(true);
      }
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, [token, logout, setAuthError]);
}

function useForbiddenErrorListener(setAuthError: (value: "expired" | "forbidden" | null) => void) {
  useEffect(() => {
    const handleForbiddenError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      const message = customEvent.detail?.message || "この操作を行う権限がありません";
      toast.error(message, {
        description: "権限を確認してください",
        duration: 5000,
      });
      setAuthError("forbidden");
    };

    window.addEventListener(FORBIDDEN_ERROR_EVENT, handleForbiddenError);
    return () => {
      window.removeEventListener(FORBIDDEN_ERROR_EVENT, handleForbiddenError);
    };
  }, [setAuthError]);
}

function useRestoreSession(
  setToken: (token: string | null) => void,
  setUser: (user: User | null) => void,
  setIsLoading: (loading: boolean) => void,
) {
  useEffect(() => {
    // Restore session on initial mount only
    const initAuth = async () => {
      const storedToken = getAuthToken();
      const isLoginPage = window.location.pathname === "/login";

      if (storedToken) {
        try {
          // http-client's beforeRequest hook automatically adds Authorization header
          const response = await httpAuth.get<User>("auth/me");
          setToken(storedToken);
          setUser(response);
        } catch (error) {
          console.warn("Failed to restore session", error);
          clearAuthToken();
          // Skip guest auto-login on login page
          if (!isLoginPage) {
            await performGuestAutoLogin(setToken, setUser);
          }
        }
      } else {
        // No stored token - perform guest auto-login (方式A)
        // Skip on login page to allow manual login
        if (!isLoginPage) {
          await performGuestAutoLogin(setToken, setUser);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [setIsLoading, setToken, setUser]);
}

/**
 * Perform automatic guest login (方式A implementation).
 * This ensures all users (including guests) are authenticated.
 */
async function performGuestAutoLogin(
  setToken: (token: string | null) => void,
  setUser: (user: User | null) => void,
) {
  try {
    const response = await httpPublic.post<{
      access_token: string;
      user: User;
    }>("auth/guest-login", {});

    setToken(response.access_token);
    setUser(response.user);
    setAuthToken(response.access_token);

    console.info("Auto-logged in as guest user:", response.user.username);
  } catch (error) {
    console.error("Failed to auto-login as guest:", error);
    // If guest login fails, user can still manually log in
    toast.error("ゲストログインに失敗しました", {
      description: "手動でログインしてください",
    });
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [authError, setAuthError] = useState<"expired" | "forbidden" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback((options?: { preserveAuthError?: boolean }) => {
    const preserveAuthError = options?.preserveAuthError ?? false;
    setToken(null);
    setUser(null);
    if (!preserveAuthError) {
      setAuthError(null);
      setAuthExpired(false);
    }
    clearAuthToken();
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAuthExpired(false);
  }, []);

  useAuthErrorListener(token, logout, setAuthError);
  useForbiddenErrorListener(setAuthError);
  useRestoreSession(setToken, setUser, setIsLoading);

  const login = async (userId: number, username?: string) => {
    const response = await httpPublic.post<{
      access_token: string;
      user: User;
    }>("auth/login", { user_id: userId, username });

    setToken(response.access_token);
    setUser(response.user);
    setAuthError(null);
    setAuthExpired(false);
    setAuthToken(response.access_token);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, authError, clearAuthError, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
