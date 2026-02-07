import { AlertTriangle, Settings2, Shield } from "lucide-react";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { SETTING_CONFIGS } from "../constants/settings";
import { SettingSection } from "../components/system-settings/SettingSection";
import { DiagnosticsSection } from "../components/system-settings/DiagnosticsSection";

import { PageContainer, PageHeader } from "@/shared/components/layout";

/* eslint-disable-next-line max-lines-per-function -- 各セクションを統合するため */
export function SystemSettingsPage() {
  const {
    settings,
    isLoading,
    isSaving,
    viewCheckStatus,
    isFixing,
    viewDetails,
    showDetails,
    setShowDetails,
    schemaCheckStatus,
    schemaCheckResult,
    handleUpdate,
    handleCheckView,
    handleFixView,
    handleShowDetails,
    handleSchemaCheck,
  } = useSystemSettings();

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
        <SettingSection
          title="システム制御"
          icon={AlertTriangle}
          iconColor="text-orange-500"
          settings={systemSettings}
          isSaving={isSaving}
          onUpdate={handleUpdate}
        />

        {/* Debug Category */}
        <SettingSection
          title="デバッグ・開発設定"
          icon={Settings2}
          iconColor="text-primary"
          settings={debugSettings}
          isSaving={isSaving}
          onUpdate={handleUpdate}
        >
          <DiagnosticsSection
            viewCheckStatus={viewCheckStatus}
            isFixing={isFixing}
            viewDetails={viewDetails}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            schemaCheckStatus={schemaCheckStatus}
            schemaCheckResult={schemaCheckResult}
            onCheckView={handleCheckView}
            onFixView={handleFixView}
            onShowViewDetails={handleShowDetails}
            onSchemaCheck={handleSchemaCheck}
          />
        </SettingSection>

        {/* Security Category */}
        <SettingSection
          title="セキュリティ・アクセス制御"
          icon={Shield}
          iconColor="text-purple-500"
          settings={securitySettings}
          isSaving={isSaving}
          onUpdate={handleUpdate}
        />

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
