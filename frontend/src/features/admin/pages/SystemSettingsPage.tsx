import { AlertTriangle, Settings2, Shield } from "lucide-react";
import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Label, Switch } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FEATURE_CONFIG } from "@/config/feature-config";
import { http } from "@/shared/api/http-client";
import { PageContainer, PageHeader } from "@/shared/components/layout";
import { cn } from "@/shared/libs/utils";
import type { PageVisibilityConfig } from "@/types/system";

interface SystemSetting {
  id: number | null;
  config_key: string;
  config_value: string;
  description: string | null;
}

type SettingType = "boolean" | "select" | "json" | "text";

interface SettingConfig {
  label: string;
  type: SettingType;
  category: "debug" | "system" | "security";
  description?: string;
  options?: { label: string; value: string }[]; // For select type
}

const SETTING_CONFIGS: Record<string, SettingConfig> = {
  enable_db_browser: {
    label: "DBブラウザの有効化",
    type: "boolean",
    category: "debug",
    description: "DBの中身を直接ブラウザで確認できるようにします。",
  },
  maintenance_mode: {
    label: "メンテナンスモード",
    type: "boolean",
    category: "system",
    description: "有効にすると、管理者以外のアクセスを遮断しメンテナンス画面を表示します。",
  },
  log_level: {
    label: "ログレベル",
    type: "select",
    category: "system",
    description: "バックエンドのログ出力レベルを変更します。",
    options: [
      { label: "DEBUG", value: "DEBUG" },
      { label: "INFO", value: "INFO" },
      { label: "WARNING", value: "WARNING" },
      { label: "ERROR", value: "ERROR" },
    ],
  },
  page_visibility: {
    label: "ページ表示制御",
    type: "json",
    category: "security",
    description: "機能ごとの表示/非表示をロール別に制御します。",
  },
};

/* eslint-disable-next-line max-lines-per-function */
export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await http.get<SystemSetting[]>("admin/system-settings");
      setSettings(data);
    } catch (e) {
      toast.error("設定の取得に失敗しました");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    setIsSaving(key);
    try {
      await http.patch(`admin/system-settings/${key}`, {
        config_value: value,
      });
      toast.success("設定を更新しました");
      setSettings((prev) =>
        prev.map((s) => (s.config_key === key ? { ...s, config_value: value } : s)),
      );
    } catch (e) {
      toast.error("設定の更新に失敗しました");
      console.error(e);
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="システム設定" subtitle="読込中..." />
      </PageContainer>
    );
  }

  const systemSettings = settings.filter(
    (s) => SETTING_CONFIGS[s.config_key]?.category === "system",
  );
  const debugSettings = settings.filter((s) => SETTING_CONFIGS[s.config_key]?.category === "debug");
  const securitySettings = settings.filter(
    (s) => SETTING_CONFIGS[s.config_key]?.category === "security",
  );
  const otherSettings = settings.filter(
    (s) => !SETTING_CONFIGS[s.config_key] && !s.config_key.startsWith("cloud_flow_"),
  );

  return (
    <PageContainer className="space-y-6">
      <PageHeader title="システム設定" subtitle="システム全体の動作を動的に変更できます" />

      <div className="grid gap-6">
        {/* System Category */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">システム制御</h3>
          </div>
          <div className="space-y-6">
            {systemSettings.map((setting) => (
              <SystemSettingItem
                key={setting.config_key}
                setting={setting}
                config={SETTING_CONFIGS[setting.config_key]}
                isSaving={isSaving === setting.config_key}
                onUpdate={handleUpdate}
              />
            ))}
            {systemSettings.length === 0 && (
              <p className="text-muted-foreground text-sm">設定項目がありません</p>
            )}
          </div>
        </div>

        {/* Debug Category */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">デバッグ・開発設定</h3>
          </div>
          <div className="space-y-6">
            {debugSettings.map((setting) => (
              <SystemSettingItem
                key={setting.config_key}
                setting={setting}
                config={SETTING_CONFIGS[setting.config_key]}
                isSaving={isSaving === setting.config_key}
                onUpdate={handleUpdate}
              />
            ))}
            {debugSettings.length === 0 && (
              <p className="text-muted-foreground text-sm">設定項目がありません</p>
            )}
          </div>
        </div>

        {/* Security Category */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">セキュリティ・アクセス制御</h3>
          </div>
          <div className="space-y-6">
            {securitySettings.map((setting) => (
              <SystemSettingItem
                key={setting.config_key}
                setting={setting}
                config={SETTING_CONFIGS[setting.config_key]}
                isSaving={isSaving === setting.config_key}
                onUpdate={handleUpdate}
              />
            ))}
            {securitySettings.length === 0 && (
              <p className="text-muted-foreground text-sm">設定項目がありません</p>
            )}
          </div>
        </div>

        {/* Other Settings (Fallback) */}
        {otherSettings.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 text-muted-foreground italic">
              その他の設定
            </h3>
            <div className="space-y-6">
              {otherSettings.map((setting) => (
                <div key={setting.config_key} className="flex flex-col gap-1">
                  <span className="font-medium">{setting.config_key}</span>
                  <span className="text-sm text-muted-foreground">{setting.config_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

interface SystemSettingItemProps {
  setting: SystemSetting;
  config: SettingConfig;
  isSaving: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

function SystemSettingItem({ setting, config, isSaving, onUpdate }: SystemSettingItemProps) {
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

interface PageVisibilityEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

interface VisibilityRowProps {
  id: string;
  label: string;
  isSub?: boolean;
  config: PageVisibilityConfig;
  onToggle: (id: string, role: "guest" | "user", checked: boolean) => void;
  disabled: boolean;
}

/* eslint-disable-next-line complexity */
function VisibilityRow({ id, label, isSub, config, onToggle, disabled }: VisibilityRowProps) {
  const featureConf = config[id] || { guest: true, user: true };

  let userInherited = false;
  let guestInherited = false;

  if (isSub) {
    const parentId = id.split(":")[0];
    const parentConf = config[parentId] || { guest: true, user: true };
    userInherited = parentConf.user;
    guestInherited = parentConf.guest;
  }

  return (
    <TableRow className={cn(isSub ? "bg-slate-50/50" : "bg-white")}>
      <TableCell
        className={cn("font-medium", isSub ? "pl-8 text-slate-500 text-sm" : "text-slate-900")}
      >
        <div className="flex items-center gap-2">
          {isSub ? "└ " : ""}
          {label}
          {!isSub && (
            <span className="ml-1 text-[10px] text-slate-400 font-mono uppercase">#{id}</span>
          )}
          {isSub && (userInherited || guestInherited) && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 font-medium">
              親から継承中
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={featureConf.user}
            onCheckedChange={(checked) => onToggle(id, "user", checked)}
            disabled={disabled}
          />
          {isSub && userInherited && !featureConf.user && (
            <span className="text-[9px] text-green-600 font-bold whitespace-nowrap">実質: ON</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={featureConf.guest}
            onCheckedChange={(checked) => onToggle(id, "guest", checked)}
            disabled={disabled}
          />
          {isSub && guestInherited && !featureConf.guest && (
            <span className="text-[9px] text-green-600 font-bold whitespace-nowrap">実質: ON</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function PageVisibilityEditor({ value, onChange, disabled }: PageVisibilityEditorProps) {
  const config = ((): PageVisibilityConfig => {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  })();

  const handleToggle = (featureKey: string, role: "guest" | "user", checked: boolean) => {
    const newConfig = { ...config };
    const current = newConfig[featureKey] || { guest: true, user: true };
    newConfig[featureKey] = {
      ...current,
      [role]: checked,
    };
    onChange(JSON.stringify(newConfig));
  };

  return (
    <div className="rounded-md border mt-2 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="w-[300px]">機能・ページ・タブ</TableHead>
            <TableHead className="text-center w-[120px]">一般ユーザー</TableHead>
            <TableHead className="text-center w-[120px]">ゲスト</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(FEATURE_CONFIG).map((feature) => (
            <React.Fragment key={feature.id}>
              <VisibilityRow
                id={feature.id}
                label={feature.label}
                config={config}
                onToggle={handleToggle}
                disabled={disabled}
              />
              {feature.subFeatures?.map((sub) => (
                <VisibilityRow
                  key={`${feature.id}:${sub.id}`}
                  id={`${feature.id}:${sub.id}`}
                  label={sub.label}
                  isSub
                  config={config}
                  onToggle={handleToggle}
                  disabled={disabled}
                />
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
