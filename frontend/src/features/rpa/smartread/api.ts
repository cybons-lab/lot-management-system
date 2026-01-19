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
 * 監視フォルダ内のファイル一覧を取得
 */
export async function getWatchDirFiles(configId: number): Promise<string[]> {
  return http.get<string[]>(`rpa/smartread/configs/${configId}/files`);
}

/**
 * 監視フォルダ内の指定ファイルを処理
 */
export async function processWatchDirFiles(
  configId: number,
  filenames: string[],
): Promise<SmartReadAnalyzeResponse[]> {
  return http.post<SmartReadAnalyzeResponse[]>(`rpa/smartread/configs/${configId}/process`, {
    filenames,
  });
}

// 以前の downloadJson, downloadCsv は削除
// hooks.ts 内の実装を使用する

// ==================== タスク・Export・変換 ====================

export interface SmartReadTask {
  task_id: string;
  name: string;
  status: string;
  created_at: string | null;
  request_count: number;
}

export interface SmartReadTaskListResponse {
  tasks: SmartReadTask[];
}

export interface SmartReadExport {
  export_id: string;
  state: string;
  task_id: string | null;
  error_message: string | null;
}

export interface SmartReadValidationError {
  row: number;
  field: string;
  message: string;
  value: string | null;
}

export interface SmartReadCsvDataResponse {
  wide_data: Record<string, unknown>[];
  long_data: Record<string, unknown>[];
  errors: SmartReadValidationError[];
  filename: string | null;
}

export interface SmartReadTransformResponse {
  long_data: Record<string, unknown>[];
  errors: SmartReadValidationError[];
}

/**
 * タスク一覧を取得
 */
export async function getTasks(configId: number): Promise<SmartReadTaskListResponse> {
  return http.get<SmartReadTaskListResponse>(`rpa/smartread/tasks?config_id=${configId}`);
}

/**
 * エクスポートを作成
 */
export async function createExport(
  configId: number,
  taskId: string,
  exportType: string = "csv",
): Promise<SmartReadExport> {
  return http.post<SmartReadExport>(`rpa/smartread/tasks/${taskId}/export?config_id=${configId}`, {
    export_type: exportType,
  });
}

/**
 * エクスポート状態を取得
 */
export async function getExportStatus(
  configId: number,
  taskId: string,
  exportId: string,
): Promise<SmartReadExport> {
  return http.get<SmartReadExport>(
    `rpa/smartread/tasks/${taskId}/export/${exportId}?config_id=${configId}`,
  );
}

/**
 * エクスポートからCSVデータを取得（横持ち・縦持ち両方）
 */
export async function getExportCsvData(
  configId: number,
  taskId: string,
  exportId: string,
): Promise<SmartReadCsvDataResponse> {
  return http.get<SmartReadCsvDataResponse>(
    `rpa/smartread/tasks/${taskId}/export/${exportId}/csv?config_id=${configId}`,
  );
}

/**
 * 横持ちデータを縦持ちに変換
 */
export async function transformCsv(
  wideData: Record<string, unknown>[],
  skipEmpty: boolean = true,
): Promise<SmartReadTransformResponse> {
  return http.post<SmartReadTransformResponse>("rpa/smartread/transform", {
    wide_data: wideData,
    skip_empty: skipEmpty,
  });
}
