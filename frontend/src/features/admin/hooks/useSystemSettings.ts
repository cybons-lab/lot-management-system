import { useState, useEffect } from "react";
import { toast } from "sonner";

import type { SystemSetting, SchemaCheckResult } from "../types";

import { http } from "@/shared/api/http-client";

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // View Diagnostics state
  const [viewCheckStatus, setViewCheckStatus] = useState<"idle" | "checking" | "ok" | "error">(
    "idle",
  );
  const [isFixing, setIsFixing] = useState(false);
  const [viewDetails, setViewDetails] = useState<{
    columns: string[];
    related_tables: Record<string, { exists: boolean; record_count?: number; columns?: string[] }>;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Schema Check state
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
        columns: { name: string }[];
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

  return {
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
  };
}
