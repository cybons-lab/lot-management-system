import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

import { http, AUTH_ERROR_EVENT } from "@/shared/api/http-client";

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
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  }, []);

  // Listen for global auth errors (401) from http-client
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
        logout();
      }
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, [token, logout]);

  useEffect(() => {
    // Restore session on initial mount only
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          // http-client's beforeRequest hook automatically adds Authorization header
          const response = await http.get<User>("auth/me");
          setToken(storedToken);
          setUser(response);
        } catch (error) {
          console.warn("Failed to restore session", error);
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []); // Only run on mount

  const login = async (userId: number, username?: string) => {
    const response = await http.post<{
      access_token: string;
      user: User;
    }>("auth/login", { user_id: userId, username });

    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem("token", response.access_token);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
