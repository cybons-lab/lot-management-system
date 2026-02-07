/**
 * SmartRead OCR API functions
 */

import type {
  SmartReadConfig,
  SmartReadConfigCreate,
  SmartReadConfigUpdate,
  SmartReadAnalyzeResponse,
  SmartReadDiagnoseResponse,
  SmartReadTaskListResponse,
  SmartReadTaskDetail,
  SmartReadExport,
  SmartReadCsvDataResponse,
  SmartReadTransformResponse,
  SmartReadLongData,
  SmartReadLongDataListResponse,
  SmartReadResetResponse,
  SmartReadRequestListResponse,
  SmartReadSaveLongDataRequest,
  SmartReadSaveLongDataResponse,
  SmartReadPadRunStartResponse,
  SmartReadPadRunListResponse,
  SmartReadPadRunStatus,
  SmartReadPadRunRetryResponse,
} from "./types";
import { logger, operationLogger } from "./utils/logger";

import { apiClient, http } from "@/shared/api/http-client";

export * from "./types";

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

  const response = await http.postFormData<{ message: string; filename: string; status: string }>(
    `rpa/smartread/analyze-simple?config_id=${configId}`,
    formData,
  );

  return {
    success: true,
    filename: response.filename,
    data: null,
    error_message: null,
  };
}

export const getWatchDirFiles = (configId: number) =>
  http.get<string[]>(`rpa/smartread/configs/${configId}/files`);
export const processWatchDirFiles = (configId: number, filenames: string[]) =>
  http.post<SmartReadAnalyzeResponse[]>(`rpa/smartread/configs/${configId}/process`, { filenames });
export const diagnoseWatchDirFile = (configId: number, filename: string) =>
  http.post<SmartReadDiagnoseResponse>(`rpa/smartread/configs/${configId}/diagnose`, { filename });

// ==================== タスク・Export・変換 ====================

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

/**
 * 自動処理を開始
 */
export async function processFilesAuto(
  configId: number,
  filenames: string[],
): Promise<SmartReadAnalyzeResponse[]> {
  return processWatchDirFiles(configId, filenames);
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

/**
 * Alias for compatibility
 */
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

// ==================== PAD Runner API ====================

/**
 * PAD互換フローを開始
 */
export async function startPadRun(
  configId: number,
  filenames: string[],
): Promise<SmartReadPadRunStartResponse> {
  operationLogger.start("PAD互換フロー開始", { configId, fileCount: filenames.length });
  try {
    const res = await http.post<SmartReadPadRunStartResponse>(
      `rpa/smartread/configs/${configId}/pad-runs`,
      { filenames },
    );
    operationLogger.success("PAD互換フロー開始", { runId: res.run_id });
    return res;
  } catch (error) {
    operationLogger.failure("PAD互換フロー開始", error);
    throw error;
  }
}

/**
 * PAD互換フロー一覧を取得
 */
export async function getPadRuns(
  configId: number,
  statusFilter?: string,
  limit: number = 20,
): Promise<SmartReadPadRunListResponse> {
  const params: Record<string, string | number> = { limit };
  if (statusFilter) {
    params.status_filter = statusFilter;
  }
  return http.get<SmartReadPadRunListResponse>(`rpa/smartread/configs/${configId}/pad-runs`, {
    searchParams: params,
  });
}

/**
 * PAD互換フロー状態を取得（STALE検出を含む）
 */
export async function getPadRunStatus(
  configId: number,
  runId: string,
): Promise<SmartReadPadRunStatus> {
  return http.get<SmartReadPadRunStatus>(`rpa/smartread/configs/${configId}/pad-runs/${runId}`);
}

/**
 * 失敗/Staleの実行をリトライ
 */
export async function retryPadRun(
  configId: number,
  runId: string,
): Promise<SmartReadPadRunRetryResponse> {
  operationLogger.start("PAD互換フローリトライ", { configId, runId });
  try {
    const res = await http.post<SmartReadPadRunRetryResponse>(
      `rpa/smartread/configs/${configId}/pad-runs/${runId}/retry`,
      null,
    );
    operationLogger.success("PAD互換フローリトライ", { newRunId: res.new_run_id });
    return res;
  } catch (error) {
    operationLogger.failure("PAD互換フローリトライ", error);
    throw error;
  }
}
/**
 * 管理者用ハイブリッドアップロード
 */
export async function adminUploadHybrid(configId: number, files: File[]): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return apiClient
    .post(`rpa/smartread/admin/upload-hybrid?config_id=${configId}`, {
      body: formData,
    })
    .blob();
}
