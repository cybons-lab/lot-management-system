import type { SystemSetting, SettingConfig } from "../types";

import { PageVisibilityEditor } from "./PageVisibilityEditor";

import { Input, Label, Switch } from "@/components/ui";

interface SystemSettingItemProps {
  setting: SystemSetting;
  config: SettingConfig;
  isSaving: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

export function SystemSettingItem({ setting, config, isSaving, onUpdate }: SystemSettingItemProps) {
  if (!config) return null;
  return (
    <div
      className={
        config.type === "json" ? "block space-y-4" : "flex items-center justify-between gap-4"
      }
    >
      <div className="space-y-0.5">
        <Label className="text-base font-semibold">{config.label}</Label>
        <p className="text-muted-foreground text-sm">{config.description || setting.description}</p>
      </div>
      <div className={config.type === "json" ? "w-full" : "flex items-center gap-4"}>
        {config.type === "boolean" && (
          <Switch
            checked={setting.config_value === "true"}
            onCheckedChange={(checked) => onUpdate(setting.config_key, checked ? "true" : "false")}
            disabled={isSaving}
          />
        )}
        {config.type === "select" && (
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
            value={setting.config_value}
            onChange={(e) => onUpdate(setting.config_key, e.target.value)}
            disabled={isSaving}
          >
            {config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {config.type === "number" && (
          <Input
            type="number"
            className="w-[120px]"
            value={setting.config_value}
            onChange={(e) => onUpdate(setting.config_key, e.target.value)}
            disabled={isSaving}
          />
        )}
        {config.type === "json" && setting.config_key === "page_visibility" && (
          <PageVisibilityEditor
            value={setting.config_value}
            onChange={(newValue) => onUpdate(setting.config_key, newValue)}
            disabled={isSaving}
          />
        )}
      </div>
    </div>
  );
}
