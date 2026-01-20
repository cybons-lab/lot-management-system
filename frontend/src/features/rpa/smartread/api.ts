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
  is_default: boolean;
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
  is_default?: boolean;
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
  is_default?: boolean;
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
  console.log("[SmartRead API] Fetching configs...");
  try {
    const res = await http.get<SmartReadConfig[]>("rpa/smartread/configs");
    console.log("[SmartRead API] Fetched configs:", res);
    return res;
  } catch (error) {
    console.error("[SmartRead API] Error fetching configs:", error);
    throw error;
  }
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

export interface SmartReadTaskDetail {
  id: number;
  config_id: number;
  task_id: string;
  task_date: string;
  name: string | null;
  state: string | null;
  synced_at: string | null;
  skip_today: boolean;
  created_at: string;
}

/**
 * タスク一覧を取得
 */
export async function getTasks(configId: number): Promise<SmartReadTaskListResponse> {
  console.log(`[SmartRead API] Fetching tasks for configId: ${configId}`);
  try {
    const res = await http.get<SmartReadTaskListResponse>(
      `rpa/smartread/tasks?config_id=${configId}`,
    );
    console.log(`[SmartRead API] Fetched tasks:`, res);
    return res;
  } catch (error) {
    console.error(`[SmartRead API] Error fetching tasks:`, error);
    throw error;
  }
}

/**
 * 管理タスク一覧を取得
 */
export async function getManagedTasks(configId: number): Promise<SmartReadTaskDetail[]> {
  console.log(`[SmartRead API] Fetching managed tasks for configId: ${configId}`);
  try {
    const res = await http.get<SmartReadTaskDetail[]>(
      `rpa/smartread/managed-tasks?config_id=${configId}`,
    );
    console.log(`[SmartRead API] Fetched managed tasks:`, res);
    return res;
  } catch (error) {
    console.error(`[SmartRead API] Error fetching managed tasks:`, error);
    throw error;
  }
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
export async function getExportCsvData(options: {
  configId: number;
  taskId: string;
  exportId: string;
  saveToDb?: boolean;
  taskDate?: string;
}): Promise<SmartReadCsvDataResponse> {
  const { configId, taskId, exportId, saveToDb = true, taskDate } = options;
  const params = new URLSearchParams({
    config_id: configId.toString(),
    save_to_db: saveToDb.toString(),
  });
  if (taskDate) {
    params.append("task_date", taskDate);
  }
  return http.get<SmartReadCsvDataResponse>(
    `rpa/smartread/tasks/${taskId}/export/${exportId}/csv?${params}`,
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

/**
 * skip_todayフラグを更新
 */
export async function updateSkipToday(
  taskId: string,
  skipToday: boolean,
): Promise<SmartReadTaskDetail> {
  console.log(`[SmartRead API] Updating skip_today for task ${taskId} to ${skipToday}`);
  try {
    const res = await http.put<SmartReadTaskDetail>(`rpa/smartread/tasks/${taskId}/skip-today`, {
      skip_today: skipToday,
    });
    console.log(`[SmartRead API] Updated skip_today:`, res);
    return res;
  } catch (error) {
    console.error(`[SmartRead API] Error updating skip_today:`, error);
    throw error;
  }
}

// ==================== requestId/results ルート ====================

export interface SmartReadRequest {
  id: number;
  request_id: string;
  task_id: string;
  task_date: string;
  config_id: number;
  filename: string | null;
  num_of_pages: number | null;
  submitted_at: string;
  state: string;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SmartReadRequestListResponse {
  requests: SmartReadRequest[];
}

export interface SmartReadProcessAutoResponse {
  task_id: string;
  task_name: string;
  requests: SmartReadRequest[];
  message: string;
}

export interface SmartReadLongDataItem {
  id: number;
  config_id: number;
  task_id: string;
  task_date: string;
  request_id_ref: number | null;
  row_index: number;
  content: Record<string, unknown>;
  status: string;
  error_reason: string | null;
  created_at: string;
}

export interface SmartReadLongDataListResponse {
  data: SmartReadLongDataItem[];
  total: number;
}

/**
 * 自動処理（requestIdルート）
 */
export async function processFilesAuto(
  configId: number,
  filenames: string[],
): Promise<SmartReadProcessAutoResponse> {
  console.log(`[SmartRead API] Processing files auto for configId: ${configId}`, filenames);
  try {
    const res = await http.post<SmartReadProcessAutoResponse>(
      `rpa/smartread/configs/${configId}/process-auto`,
      { filenames, use_daily_task: true },
    );
    console.log(`[SmartRead API] Process auto response:`, res);
    return res;
  } catch (error) {
    console.error(`[SmartRead API] Error processing files auto:`, error);
    throw error;
  }
}

/**
 * リクエスト一覧を取得
 */
export async function getRequests(
  configId: number,
  state?: string,
  limit: number = 100,
): Promise<SmartReadRequestListResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (state) {
    params.append("state", state);
  }
  return http.get<SmartReadRequestListResponse>(
    `rpa/smartread/configs/${configId}/requests?${params}`,
  );
}

/**
 * 縦持ちデータ一覧を取得
 */
export async function getLongData(
  configId: number,
  limit: number = 100,
): Promise<SmartReadLongDataListResponse> {
  return http.get<SmartReadLongDataListResponse>(
    `rpa/smartread/configs/${configId}/long-data?limit=${limit}`,
  );
}
