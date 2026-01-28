import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";

import { type PublicSystemSettings } from "../types/system";

import { useAuth } from "@/features/auth/AuthContext";
import { httpPublic } from "@/shared/api/http-client";

interface SystemSettingsContextType {
  settings: PublicSystemSettings | null;
  isLoading: boolean;
  reloadSettings: () => Promise<void>;
  isFeatureVisible: (feature: string) => boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | null>(null);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PublicSystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use httpPublic to fetch settings even without a session
      const data = await httpPublic.get<PublicSystemSettings>("system/public-settings");
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isFeatureVisible = useCallback(
    (feature: string) => {
      if (!settings?.page_visibility) return true; // Default to visible if no config

      const config = settings.page_visibility[feature];
      if (!config) return true; // Default to visible if feature not configured

      // Determine role (simplified: admin is user, or treated specially?)
      // User request said: "Guest" vs "General User"
      // My auth system has: roles=["admin", "user"] etc.

      const roles = user?.roles || [];
      const isAdmin = roles.includes("admin");

      // Admin always sees everything? Or subject to "user" config?
      // Usually admin sees everything.
      if (isAdmin) return true;

      const isUser = roles.includes("user");
      // If has "user" role, check "user" config
      if (isUser) return config.user;

      // Otherwise treat as guest (or "guest" role if it exists)
      return config.guest;
    },
    [settings, user],
  );

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isLoading,
        reloadSettings: fetchSettings,
        isFeatureVisible,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
}
