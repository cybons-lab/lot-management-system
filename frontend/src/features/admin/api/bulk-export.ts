/**
 * Bulk Export API
 * 一括エクスポート機能のAPI呼び出し
 */

import { apiClient } from "@/shared/api/http-client";

export interface ExportTarget {
  key: string;
  name: string;
  description: string;
}

/**
 * エクスポート可能なターゲット一覧を取得
 */
export async function getExportTargets(): Promise<ExportTarget[]> {
  return apiClient.get("bulk-export/targets").json<ExportTarget[]>();
}

/**
 * 選択したターゲットをZIPでダウンロード
 */
export async function downloadBulkExport(
  targets: string[],
  format: "xlsx" | "csv" = "xlsx",
): Promise<void> {
  const params = new URLSearchParams();
  targets.forEach((t) => params.append("targets", t));
  params.append("format", format);

  const response = await apiClient.get(`bulk-export/download?${params.toString()}`);
  const blob = await response.blob();

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "bulk_export.zip");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
