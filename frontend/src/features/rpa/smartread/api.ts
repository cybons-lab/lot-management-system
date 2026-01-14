/**
 * SmartRead OCR API functions
 */

import { http, apiClient } from "@/shared/api/http-client";

// Types
export interface SmartReadConfig {
  id: number;
  name: string;
  endpoint: string;
  api_key: string;
  request_type: string;
  template_ids: string | null;
  export_type: string;
  aggregation_type: string | null;
  watch_dir: string | null;
  export_dir: string | null;
  input_exts: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmartReadConfigCreate {
  name: string;
  endpoint: string;
  api_key: string;
  request_type?: string;
  template_ids?: string | null;
  export_type?: string;
  aggregation_type?: string | null;
  watch_dir?: string | null;
  export_dir?: string | null;
  input_exts?: string | null;
  description?: string | null;
}

export interface SmartReadConfigUpdate {
  name?: string;
  endpoint?: string;
  api_key?: string;
  request_type?: string;
  template_ids?: string | null;
  export_type?: string;
  aggregation_type?: string | null;
  watch_dir?: string | null;
  export_dir?: string | null;
  input_exts?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface SmartReadAnalyzeResponse {
  success: boolean;
  filename: string;
  data: Record<string, unknown>[];
  error_message: string | null;
}

// API functions

/**
 * 全設定一覧を取得
 */
export async function getConfigs(): Promise<SmartReadConfig[]> {
  return http.get<SmartReadConfig[]>("rpa/smartread/configs");
}

/**
 * 設定を取得
 */
export async function getConfig(configId: number): Promise<SmartReadConfig> {
  return http.get<SmartReadConfig>(`rpa/smartread/configs/${configId}`);
}

/**
 * 設定を作成
 */
export async function createConfig(data: SmartReadConfigCreate): Promise<SmartReadConfig> {
  return http.post<SmartReadConfig>("rpa/smartread/configs", data);
}

/**
 * 設定を更新
 */
export async function updateConfig(
  configId: number,
  data: SmartReadConfigUpdate,
): Promise<SmartReadConfig> {
  return http.put<SmartReadConfig>(`rpa/smartread/configs/${configId}`, data);
}

/**
 * 設定を削除
 */
export async function deleteConfig(configId: number): Promise<void> {
  return http.deleteVoid(`rpa/smartread/configs/${configId}`);
}

/**
 * ファイルをSmartRead APIで解析
 */
export async function analyzeFile(configId: number, file: File): Promise<SmartReadAnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient
    .post(`rpa/smartread/analyze?config_id=${configId}`, { body: formData })
    .json<SmartReadAnalyzeResponse>();
}

/**
 * データをJSONでダウンロード
 */
export async function downloadJson(
  data: Record<string, unknown>[],
  filename: string = "export.json",
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * データをCSVでダウンロード
 */
export async function downloadCsv(
  data: Record<string, unknown>[],
  filename: string = "export.csv",
): Promise<void> {
  if (data.length === 0) {
    return;
  }

  // フラット化してCSV生成
  const flatData = data.map((item) => flattenObject(item));
  const headers = Object.keys(flatData[0] || {});
  const csvRows = [
    headers.join(","),
    ...flatData.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ];
  const csvContent = csvRows.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ネストされたオブジェクトをフラット化
 */
function flattenObject(obj: Record<string, unknown>, prefix: string = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
