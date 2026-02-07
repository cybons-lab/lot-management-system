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

interface VisibilityEntry {
  user: boolean;
  guest: boolean;
}

function normalizeVisibilityEntry(value: unknown): VisibilityEntry {
  if (typeof value === "boolean") {
    return { user: value, guest: value };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const user = typeof record.user === "boolean" ? record.user : true;
    const guest = typeof record.guest === "boolean" ? record.guest : true;
    return { user, guest };
  }

  return { user: true, guest: true };
}

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
      const checkVisibility = (key: string): boolean => {
        if (!settings?.page_visibility) return true;

        // Handle hierarchical features (e.g., "inventory:lots")
        if (key.includes(":")) {
          const parent = key.split(":")[0];
          // If parent is NOT visible, child is automatically NOT visible.
          // But if parent IS visible, we do NOT return true immediately;
          // we allow the child's own configuration to decide.
          if (parent && !checkVisibility(parent)) {
            return false;
          }
        }

        const rawConfig = settings.page_visibility[key];
        if (rawConfig === undefined) return true; // Default to visible if not configured
        const config = normalizeVisibilityEntry(rawConfig);

        const roles = user?.roles || [];
        const isAdmin = roles.includes("admin");
        if (isAdmin) return true;

        const isUser = roles.includes("user");
        if (isUser) return config.user;

        return config.guest;
      };

      return checkVisibility(feature);
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
