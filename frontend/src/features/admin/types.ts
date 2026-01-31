export interface SystemSetting {
  id: number | null;
  config_key: string;
  config_value: string;
  description: string | null;
}

export type SettingType = "boolean" | "select" | "json" | "text";

export interface SettingConfig {
  label: string;
  type: SettingType;
  category: "debug" | "system" | "security";
  description?: string;
  options?: { label: string; value: string }[]; // For select type
}
