import { AlertTriangle, Settings2, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { SystemSettingItem } from "../components/SystemSettingItem";
import type { SystemSetting, SettingConfig } from "../types";

import { http } from "@/shared/api/http-client";
import { PageContainer, PageHeader } from "@/shared/components/layout";

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
