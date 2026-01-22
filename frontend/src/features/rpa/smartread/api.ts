/**
 * SmartRead OCR API functions
 */

import { logger, operationLogger } from "./utils/logger";

import { http } from "@/shared/api/http-client";

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
  is_active?: boolean;
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

export interface SmartReadDiagnoseResult {
  success: boolean;
  error_message: string | null;
  response: Record<string, unknown> | null;
}

export interface SmartReadDiagnoseResponse {
  request_flow: SmartReadDiagnoseResult;
  export_flow: SmartReadDiagnoseResult;
}

// API functions

/**
 * 全設定一覧を取得
 */
export async function getConfigs(): Promise<SmartReadConfig[]> {
  operationLogger.start("設定一覧取得");
  try {
    const res = await http.get<SmartReadConfig[]>("rpa/smartread/configs");
    operationLogger.success("設定一覧取得", { count: res.length });
    return res;
  } catch (error) {
    operationLogger.failure("設定一覧取得", error);
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
 * ファイルをSmartRead APIで解析（バックグラウンド処理）
 */
export async function analyzeFile(configId: number, file: File): Promise<SmartReadAnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // Use analyze-simple for background processing with DB persistence
  const response = await http.postFormData<{ message: string; filename: string; status: string }>(
    `rpa/smartread/analyze-simple?config_id=${configId}`,
    formData,
  );

  // Return a success response matching SmartReadAnalyzeResponse interface
  return {
    success: true,
    filename: response.filename,
    data: null,
    error_message: null,
  };
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

/**
 * 監視フォルダファイルをSmartRead APIで診断
 */
export async function diagnoseWatchDirFile(
  configId: number,
  filename: string,
): Promise<SmartReadDiagnoseResponse> {
  return http.post<SmartReadDiagnoseResponse>(`rpa/smartread/configs/${configId}/diagnose`, {
    filename,
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

export interface SmartReadLongData {
  id: number;
  config_id: number;
  task_id: string;
  task_date: string;
  row_index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  status: string;
  error_reason: string | null;
  created_at: string;
}

export interface SmartReadLongDataListResponse {
  data: SmartReadLongData[];
}

export interface SmartReadResetResponse {
  success: boolean;
  deleted_long_count: number;
  deleted_wide_count: number;
  deleted_request_count: number;
  deleted_task_count: number;
  deleted_export_history_count: number;
  message: string;
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
 * タスク一覧を取得 (SmartRead APIから + DBに保存)
 */
export async function getTasks(configId: number): Promise<SmartReadTaskListResponse> {
  operationLogger.start("タスク一覧取得 (API)", { configId });
  try {
    const res = await http.get<SmartReadTaskListResponse>(
      `rpa/smartread/tasks?config_id=${configId}`,
    );
    operationLogger.success("タスク一覧取得 (API)", { count: res.tasks?.length || 0 });
    return res;
  } catch (error) {
    operationLogger.failure("タスク一覧取得 (API)", error);
    throw error;
  }
}

/**
 * 管理タスク一覧を取得 (DBから)
 */
export async function getManagedTasks(configId: number): Promise<SmartReadTaskDetail[]> {
  operationLogger.start("管理タスク取得 (DB)", { configId });
  try {
    const res = await http.get<SmartReadTaskDetail[]>(
      `rpa/smartread/managed-tasks?config_id=${configId}`,
    );
    operationLogger.success("管理タスク取得 (DB)", { count: res.length });
    return res;
  } catch (error) {
    operationLogger.failure("管理タスク取得 (DB)", error);
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
 * タスクの結果を強制的に同期 (API -> DB)
 *
 * OCR処理には時間がかかるため、タイムアウトを5分に設定
 */
export async function syncTaskResults(
  configId: number,
  taskId: string,
  force: boolean = false,
): Promise<SmartReadCsvDataResponse> {
  logger.info("タスク同期開始", { taskId, configId, force });
  const params = new URLSearchParams({
    config_id: configId.toString(),
    force: force.toString(),
  });
  // OCR処理完了まで待つため、タイムアウトを5分に延長
  return http.post<SmartReadCsvDataResponse>(`rpa/smartread/tasks/${taskId}/sync?${params}`, null, {
    timeout: 300000, // 5 minutes
  });
}

/**
 * skip_todayフラグを更新
 */
export async function updateSkipToday(
  taskId: string,
  skipToday: boolean,
): Promise<SmartReadTaskDetail> {
  operationLogger.start("スキップ設定更新", { taskId, skipToday });
  try {
    const res = await http.put<SmartReadTaskDetail>(`rpa/smartread/tasks/${taskId}/skip-today`, {
      skip_today: skipToday,
    });
    operationLogger.success("スキップ設定更新", { taskId, skipToday: res.skip_today });
    return res;
  } catch (error) {
    operationLogger.failure("スキップ設定更新", error);
    throw error;
  }
}

// ==================== RequestId/Results Automation ====================

export interface SmartReadRequest {
  id: number;
  request_id: string;
  task_id: string;
  task_date: string;
  config_id: number;
  filename: string;
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

export interface SmartReadProcessAutoRequest {
  filenames: string[];
}

export interface SmartReadProcessAutoResponse {
  task_id: string;
  task_name: string;
  requests: SmartReadRequest[];
  message: string;
}

/**
 * 自動処理を開始 (process-auto)
 */
export async function processFilesAuto(
  configId: number,
  filenames: string[],
): Promise<SmartReadProcessAutoResponse> {
  return http.post<SmartReadProcessAutoResponse>(`rpa/smartread/configs/${configId}/process-auto`, {
    filenames,
  });
}

/**
 * リクエスト一覧を取得
 */
export async function getRequests(
  configId: number,
  state?: string,
  limit: number = 100,
): Promise<SmartReadRequestListResponse> {
  const searchParams: Record<string, string | number> = { limit };
  if (state) {
    searchParams.state = state;
  }
  return http.get<SmartReadRequestListResponse>(`rpa/smartread/configs/${configId}/requests`, {
    searchParams,
  });
}

/**
 * 縦持ちデータ一覧を取得 (Unified)
 */
export async function getLongData(
  configId: number,
  taskId?: string,
  limit: number = 100,
): Promise<SmartReadLongDataListResponse> {
  const searchParams: Record<string, string | number> = { limit };
  if (taskId) {
    searchParams.task_id = taskId;
  }
  return http.get<SmartReadLongDataListResponse>(`rpa/smartread/configs/${configId}/long-data`, {
    searchParams,
  });
}

/**
 * SmartReadデータをリセット (テスト用)
 */
export async function resetSmartReadData(configId: number): Promise<SmartReadResetResponse> {
  return http.delete<SmartReadResetResponse>(`rpa/smartread/configs/${configId}/reset-data`);
}

// Alias for compatibility if needed, or remove if unused calls are updated
export const getSmartReadLongDataList = async (
  configId: number,
  limit: number = 1000,
): Promise<SmartReadLongData[]> => {
  const res = await getLongData(configId, undefined, limit);
  return res.data;
};

/**
 * 縦持ちデータをDBに保存 (フロントエンドで変換したデータ用)
 */
export interface SmartReadSaveLongDataRequest {
  config_id: number;
  task_id: string;
  task_date: string;
  wide_data: Record<string, unknown>[];
  long_data: Record<string, unknown>[];
  filename: string | null;
}

export interface SmartReadSaveLongDataResponse {
  success: boolean;
  saved_wide_count: number;
  saved_long_count: number;
  message: string;
}

export async function saveLongData(
  taskId: string,
  data: SmartReadSaveLongDataRequest,
): Promise<SmartReadSaveLongDataResponse> {
  operationLogger.start("縦持ちデータ保存", { taskId });
  return http.post<SmartReadSaveLongDataResponse>(
    `rpa/smartread/tasks/${taskId}/save-long-data`,
    data,
  );
}
