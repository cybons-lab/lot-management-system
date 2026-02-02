export interface SystemSetting {
  id: number | null;
  config_key: string;
  config_value: string;
  description: string | null;
}

export type SettingType = "boolean" | "select" | "json" | "text" | "number";

export interface SettingConfig {
  label: string;
  type: SettingType;
  category: "debug" | "system" | "security";
  description?: string;
  options?: { label: string; value: string }[]; // For select type
}

// Schema check types
export interface SchemaCheckIssue {
  severity: string;
  type: string;
  message: string;
}

export interface SchemaEntityStatus {
  exists: boolean;
  status: string;
  columns?: string[];
  missing?: string[];
}

export interface SchemaCheckResult {
  status: string;
  tables: Record<string, SchemaEntityStatus>;
  views: Record<string, SchemaEntityStatus>;
  issues: SchemaCheckIssue[];
}
