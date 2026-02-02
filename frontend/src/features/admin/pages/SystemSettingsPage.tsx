import {
  AlertTriangle,
  Settings2,
  Shield,
  Database,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { SystemSettingItem } from "../components/SystemSettingItem";
import type { SystemSetting, SettingConfig, SchemaCheckResult, SchemaEntityStatus } from "../types";

import { Button } from "@/components/ui/base/button";
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
  // SQL Profiler
  sql_profiler_enabled: {
    label: "SQLプロファイラ有効化",
    type: "boolean",
    category: "debug",
    description: "API毎のSQL実行数・時間を計測し、ログに出力します。",
  },
  sql_profiler_threshold_count: {
    label: "SQL実行数・警告しきい値",
    type: "number",
    category: "debug",
    description: "1リクエストでこの回数を超えると警告ログを出します（デフォルト: 10）。",
  },
  sql_profiler_threshold_time: {
    label: "SQL実行時間・警告しきい値(ms)",
    type: "number",
    category: "debug",
    description: "1リクエストでこの時間を超えると警告ログを出します（デフォルト: 500ms）。",
  },
  sql_profiler_n_plus_one_threshold: {
    label: "N+1検知・重複しきい値",
    type: "number",
    category: "debug",
    description:
      "同一形状のSQLがこの回数を超えて実行されるとN+1として警告します（デフォルト: 5）。",
  },
  sql_profiler_normalize_literals: {
    label: "SQLリテラル正規化",
    type: "boolean",
    category: "debug",
    description: "N+1検知時に数値や文字列リテラルを同一視するかどうか（デフォルト: 有効）。",
  },
};

/* eslint-disable max-lines, max-lines-per-function, complexity */
export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [viewCheckStatus, setViewCheckStatus] = useState<"idle" | "checking" | "ok" | "error">(
    "idle",
  );
  const [isFixing, setIsFixing] = useState(false);
  const [viewDetails, setViewDetails] = useState<{
    columns: string[];
    related_tables: Record<string, { exists: boolean; record_count?: number; columns?: string[] }>;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [schemaCheckStatus, setSchemaCheckStatus] = useState<
    "idle" | "checking" | "ok" | "warning" | "error"
  >("idle");
  const [schemaCheckResult, setSchemaCheckResult] = useState<SchemaCheckResult | null>(null);

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

  const handleCheckView = async () => {
    setViewCheckStatus("checking");
    try {
      const result = await http.get<{ has_supplier_item_id: boolean; message: string }>(
        "admin/diagnostics/view-check",
      );
      if (result.has_supplier_item_id) {
        setViewCheckStatus("ok");
        toast.success(result.message);
      } else {
        setViewCheckStatus("error");
        toast.error(result.message);
      }
    } catch (e) {
      setViewCheckStatus("error");
      toast.error("ビューチェックに失敗しました");
      console.error(e);
    }
  };

  const handleFixView = async () => {
    setIsFixing(true);
    try {
      const result = await http.post<{ success: boolean; message: string }>(
        "admin/diagnostics/view-fix",
      );
      if (result.success) {
        toast.success(result.message);
        setViewCheckStatus("ok");
      } else {
        toast.error("ビュー修正に失敗しました");
      }
    } catch (e) {
      toast.error("ビュー修正に失敗しました");
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  const handleShowDetails = async () => {
    try {
      const result = await http.get<{
        columns: Array<{ name: string }>;
        related_tables: Record<
          string,
          { exists: boolean; record_count?: number; columns?: string[] }
        >;
      }>("admin/diagnostics/view-definition");

      setViewDetails({
        columns: result.columns.map((c) => c.name),
        related_tables: result.related_tables,
      });
      setShowDetails(true);
    } catch (e) {
      toast.error("ビュー詳細の取得に失敗しました");
      console.error(e);
    }
  };

  const handleSchemaCheck = async () => {
    setSchemaCheckStatus("checking");
    try {
      const result = await http.get<SchemaCheckResult>("admin/diagnostics/schema-check");

      setSchemaCheckResult(result);
      setSchemaCheckStatus(result.status as "ok" | "warning" | "error");

      if (result.status === "ok") {
        toast.success("スキーマチェック完了: 問題ありません");
      } else if (result.status === "warning") {
        toast.warning(`スキーマチェック完了: ${result.issues.length}件の警告があります`);
      } else {
        toast.error(`スキーマチェック完了: ${result.issues.length}件のエラーが検出されました`);
      }
    } catch (e) {
      setSchemaCheckStatus("error");
      toast.error("スキーマチェックに失敗しました");
      console.error(e);
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

            {/* View Diagnostics */}
            <div className="border-t pt-6">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-medium">ビュー定義診断（Phase1対応）</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      v_lot_receipt_stock ビューに supplier_item_id 列が存在するかチェックします。
                      本番環境で在庫ページがエラーになる場合に使用してください。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckView}
                      disabled={viewCheckStatus === "checking"}
                    >
                      {viewCheckStatus === "checking" ? "チェック中..." : "ビューをチェック"}
                    </Button>
                    {viewCheckStatus === "error" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleFixView}
                          disabled={isFixing}
                        >
                          {isFixing ? "修正中..." : "ビューを修正"}
                        </Button>
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>修正が必要です</span>
                        </div>
                      </>
                    )}
                    {viewCheckStatus === "ok" && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>正常です</span>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleShowDetails}>
                      詳細を表示
                    </Button>
                  </div>

                  {/* 詳細情報モーダル */}
                  {showDetails && viewDetails && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">ビュー詳細情報</h3>
                          <button
                            onClick={() => setShowDetails(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>

                        {/* 列情報 */}
                        <div className="mb-6">
                          <h4 className="font-medium mb-2">
                            ビュー列情報 ({viewDetails.columns.length}列)
                          </h4>
                          <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 max-h-60 overflow-auto">
                            <ul className="text-sm space-y-1 font-mono">
                              {viewDetails.columns.map((col, idx) => (
                                <li
                                  key={idx}
                                  className={
                                    col === "supplier_item_id" ? "text-green-600 font-bold" : ""
                                  }
                                >
                                  {idx + 1}. {col}
                                  {col === "supplier_item_id" && " ✓ (重要)"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* 関連テーブル情報 */}
                        <div>
                          <h4 className="font-medium mb-2">関連テーブル情報</h4>
                          <div className="space-y-3">
                            {Object.entries(viewDetails.related_tables).map(([table, info]) => (
                              <div key={table} className="bg-gray-100 dark:bg-gray-900 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-mono font-semibold">{table}</span>
                                  {info.exists ? (
                                    <span className="text-green-600 text-sm">
                                      ✓ 存在 ({info.record_count} レコード)
                                    </span>
                                  ) : (
                                    <span className="text-red-600 text-sm">✗ 存在しません</span>
                                  )}
                                </div>
                                {info.exists && info.columns && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                    列: {info.columns.slice(0, 5).join(", ")}
                                    {info.columns.length > 5 &&
                                      ` ...他${info.columns.length - 5}列`}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 text-right">
                          <Button onClick={() => setShowDetails(false)}>閉じる</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schema Integrity Check */}
            <div className="border-t pt-6">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-medium">スキーマ整合性チェック（包括診断）</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      開発環境と本番環境のスキーマ差分を検出します。
                      主要テーブル・ビューの存在確認、必須カラム（supplier_item_id等）のチェックを実施。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSchemaCheck}
                      disabled={schemaCheckStatus === "checking"}
                    >
                      {schemaCheckStatus === "checking" ? "チェック中..." : "スキーマをチェック"}
                    </Button>
                    {schemaCheckStatus === "error" && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>エラーが検出されました</span>
                      </div>
                    )}
                    {schemaCheckStatus === "warning" && (
                      <div className="flex items-center gap-1 text-yellow-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>警告があります</span>
                      </div>
                    )}
                    {schemaCheckStatus === "ok" && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>正常です</span>
                      </div>
                    )}
                  </div>

                  {/* スキーマチェック結果 */}
                  {schemaCheckResult && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
                      {/* 問題一覧 */}
                      {schemaCheckResult.issues.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2 text-sm">検出された問題:</h5>
                          <div className="space-y-2">
                            {schemaCheckResult.issues.map((issue, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded text-sm ${
                                  issue.severity === "error"
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {issue.severity === "error" ? (
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div className="font-medium">{issue.type}</div>
                                    <div className="mt-1">{issue.message}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* テーブル状況 */}
                      <div>
                        <h5 className="font-medium mb-2 text-sm">テーブル状況:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(schemaCheckResult.tables).map(
                            ([table, info]: [string, SchemaEntityStatus]) => (
                              <div
                                key={table}
                                className={`p-2 rounded text-xs font-mono ${
                                  info.status === "ok"
                                    ? "bg-green-50 dark:bg-green-900/20"
                                    : "bg-red-50 dark:bg-red-900/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{table}</span>
                                  {info.status === "ok" ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* ビュー状況 */}
                      <div>
                        <h5 className="font-medium mb-2 text-sm">ビュー状況:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(schemaCheckResult.views).map(
                            ([view, info]: [string, SchemaEntityStatus]) => (
                              <div
                                key={view}
                                className={`p-2 rounded text-xs font-mono ${
                                  info.status === "ok"
                                    ? "bg-green-50 dark:bg-green-900/20"
                                    : "bg-red-50 dark:bg-red-900/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{view}</span>
                                  {info.status === "ok" ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-600" />
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
