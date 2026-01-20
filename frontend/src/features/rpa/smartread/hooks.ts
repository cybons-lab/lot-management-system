/**
 * SmartRead OCR TanStack Query hooks
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable max-depth */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SmartReadConfigCreate, SmartReadConfigUpdate, SmartReadAnalyzeResponse } from "./api";
import {
  getConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  analyzeFile,
  getWatchDirFiles,
  processWatchDirFiles,
  getTasks,
  getManagedTasks,
  createExport,
  getExportStatus,
  getExportCsvData,
  getRequests,
  syncTaskResults,
  transformCsv,
  updateSkipToday,
} from "./api";
import { processFilesAuto } from "./api";

import { ApiError } from "@/utils/errors/custom-errors";
const SMARTREAD_QUERY_KEYS = {
  all: ["smartread"] as const,
  configs: () => [...SMARTREAD_QUERY_KEYS.all, "configs"] as const,
  config: (id: number) => [...SMARTREAD_QUERY_KEYS.configs(), id] as const,
  tasks: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "tasks"] as const,
  managedTasks: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "managed-tasks"] as const,
  longData: (id: number, taskId?: string) => {
    const key = [...SMARTREAD_QUERY_KEYS.config(id), "long-data"];
    return (taskId ? [...key, taskId] : key) as readonly any[];
  },
  requests: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "requests"] as const,
  files: (id: number) => [...SMARTREAD_QUERY_KEYS.config(id), "files"] as const,
};

/**
 * 全設定一覧を取得
 */
export function useSmartReadConfigs() {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.configs(),
    queryFn: getConfigs,
    // 【設計判断】401/403等の認証系エラーはリトライしても解決しないため抑制
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    // キャッシュを長めに保持し、ページ遷移のたびにリクエストが発生するのを抑制
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * 設定を取得
 */
export function useSmartReadConfig(configId: number) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.config(configId),
    queryFn: () => getConfig(configId),
    enabled: !!configId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 設定を作成
 */
export function useCreateSmartReadConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SmartReadConfigCreate) => createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.configs() });
      toast.success("設定を作成しました");
    },
    onError: (error: Error) => {
      toast.error(`設定の作成に失敗しました: ${error.message}`);
    },
  });
}

/**
 * 設定を更新
 */
export function useUpdateSmartReadConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, data }: { configId: number; data: SmartReadConfigUpdate }) =>
      updateConfig(configId, data),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.config(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.configs() });
      toast.success("設定を更新しました");
    },
    onError: (error: Error) => {
      toast.error(`設定の更新に失敗しました: ${error.message}`);
    },
  });
}

/**
 * 設定を削除
 */
export function useDeleteSmartReadConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => deleteConfig(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.configs() });
      toast.success("設定を削除しました");
    },
    onError: (error: Error) => {
      toast.error(`設定の削除に失敗しました: ${error.message}`);
    },
  });
}

/**
 * ファイルをSmartRead APIで解析
 */
export function useAnalyzeFile() {
  return useMutation<SmartReadAnalyzeResponse, Error, { configId: number; file: File }>({
    mutationFn: ({ configId, file }) => analyzeFile(configId, file),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.filename} の解析が完了しました`);
      } else {
        toast.error(`解析に失敗しました: ${result.error_message || "不明なエラー"}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`解析に失敗しました: ${error.message}`);
    },
  });
}

/**
 * 監視フォルダ内のファイル一覧を取得
 */
export function useWatchDirFiles(configId: number | null) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.files(configId ?? 0),
    queryFn: () => getWatchDirFiles(configId!),
    enabled: !!configId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 1000 * 60 * 2, // 監視フォルダは少し短めに（2分）
  });
}

/**
 * 監視フォルダ内のファイルを処理
 */
export function useProcessWatchDirFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames: string[] }) =>
      processWatchDirFiles(configId, filenames),
    onSuccess: (results, { configId }) => {
      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        toast.success(`${successCount}件のファイルを処理しました`);
      }

      const errors = results.filter((r) => !r.success);
      if (errors.length > 0) {
        toast.error(`${errors.length}件の処理に失敗しました`);
      }

      // ファイル一覧を更新
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.files(configId) });
    },
    onError: (error: Error) => {
      toast.error(`処理に失敗しました: ${error.message}`);
    },
  });
}

// ==================== タスク・Export ====================

/**
 * タスク一覧を取得 (SmartRead API)
 * NOTE: 主に "Sync" ボタンから手動で呼び出されることを想定
 */
export function useSmartReadTasks(configId: number | null, enabled: boolean = false) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.tasks(configId ?? 0),
    queryFn: async () => {
      if (!configId) return { tasks: [] };
      console.info(`[SmartRead] Syncing tasks from [SERVER] for config_id=${configId}...`);
      const res = await getTasks(configId);
      console.info(`[SmartRead] Tasks synced from [SERVER]: ${res.tasks.length} items`);
      return res;
    },
    enabled: !!configId && enabled,
    staleTime: Infinity, // キャッシュを永続化（手動更新のみ）
  });
}

/**
 * 管理タスク一覧を取得 (DB)
 * NOTE: メインのタスク一覧表示に使用
 */
export function useManagedTasks(configId: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.managedTasks(configId ?? 0),
    queryFn: async () => {
      if (!configId) return [];
      console.info(`[SmartRead] Fetching tasks from [DB] for config_id=${configId}...`);
      const res = await getManagedTasks(configId);
      console.info(`[SmartRead] Tasks loaded from [DB]: ${res.length} items`);
      return res;
    },
    enabled: !!configId && enabled,
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });
}

/**
 * エクスポートを作成
 */
export function useCreateExport() {
  return useMutation({
    mutationFn: ({
      configId,
      taskId,
      exportType = "csv",
    }: {
      configId: number;
      taskId: string;
      exportType?: string;
    }) => createExport(configId, taskId, exportType),
    onError: (error: Error) => {
      toast.error(`エクスポート作成に失敗しました: ${error.message}`);
    },
  });
}

/**
 * エクスポート状態を取得
 */
export function useExportStatus(
  configId: number | null,
  taskId: string | null,
  exportId: string | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey:
      configId && taskId && exportId
        ? [...SMARTREAD_QUERY_KEYS.config(configId), "export", taskId, exportId]
        : [],
    queryFn: () =>
      configId && taskId && exportId
        ? getExportStatus(configId, taskId, exportId)
        : Promise.resolve(null),
    enabled: !!configId && !!taskId && !!exportId && enabled,
    refetchInterval: (query) => {
      // RUNNING状態なら5秒ごとにポーリング
      const data = query.state.data;
      if (data && data.state === "RUNNING") {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * エクスポートからCSVデータを取得 (キャッシュファースト + クライアント側変換)
 * NOTE: enabled=false で定義し、明示的な refetch() で実行することを想定
 */

export function useExportCsvData(options: {
  configId: number | null;
  taskId: string | null;
  exportId: string | null;
  saveToDb?: boolean;
  taskDate?: string;
}) {
  const { configId, taskId, exportId, saveToDb = true, taskDate } = options;

  return useQuery({
    queryKey:
      configId && taskId && exportId
        ? [...SMARTREAD_QUERY_KEYS.config(configId), "csv", taskId, exportId, saveToDb, taskDate]
        : [],
    queryFn: async () => {
      if (!configId || !taskId || !exportId) {
        return null;
      }

      console.group(`[SmartRead] useExportCsvData: Fetching CSV for ExportID=${exportId}`);
      try {
        // 1. Check cache first
        try {
          const { exportCache } = await import("./db/export-cache");
          const cached = await exportCache.get(configId, taskId, exportId);

          if (cached) {
            console.info(
              `[SmartRead] Data source: [CACHE] (Hit) | Cached At: ${new Date(cached.cached_at).toLocaleString()}`,
            );
            return {
              wide_data: cached.wide_data,
              long_data: cached.long_data,
              errors: cached.errors,
              filename: cached.filename,
              source: "cache",
            };
          }
        } catch (e) {
          console.warn("[SmartRead] Failed to check cache, proceeding to server fetch", e);
        }

        // 2. Fetch from server
        console.info(`[SmartRead] Data source: [SERVER] (Cache Miss, Fetching...)`);
        const serverData = await getExportCsvData({
          configId,
          taskId,
          exportId,
          saveToDb,
          taskDate,
        });
        console.info(`[SmartRead] Server Response Received. Filename: ${serverData.filename}`);

        // 3. Transform wide to long on client side
        console.group(`[SmartRead] Auto-Transformation (Wide -> Long)`);
        const wideData = serverData.wide_data as Array<Record<string, any>>;
        console.info(`[SmartRead] Input Wide Rows: ${wideData.length}`);

        const { SmartReadCsvTransformer } = await import("./utils/csv-transformer");
        const transformer = new SmartReadCsvTransformer();
        const transformResult = transformer.transformToLong(wideData, true);

        console.info(`[SmartRead] Transformation Result:`, {
          longRows: transformResult.long_data.length,
          errors: transformResult.errors.length,
        });
        console.groupEnd();

        // 4. Cache the result
        try {
          console.info(`[SmartRead] Caching result to IndexedDB...`);
          const { exportCache } = await import("./db/export-cache");
          await exportCache.set({
            config_id: configId,
            task_id: taskId,
            export_id: exportId,
            wide_data: serverData.wide_data as Array<Record<string, any>>,
            long_data: transformResult.long_data,
            errors: transformResult.errors,
            filename: serverData.filename,
          });
        } catch (e) {
          console.error("[SmartRead] Failed to cache result", e);
        }

        return {
          wide_data: serverData.wide_data,
          long_data: transformResult.long_data,
          errors: transformResult.errors,
          filename: serverData.filename,
          source: "server",
        };
      } finally {
        console.groupEnd();
      }
    },
    enabled: false, // Explicit trigger only
    staleTime: Infinity,
  });
}

/**
 * 横持ち→縦持ち変換
 */
export function useTransformCsv() {
  return useMutation({
    mutationFn: ({
      wideData,
      skipEmpty = true,
    }: {
      wideData: Record<string, unknown>[];
      skipEmpty?: boolean;
    }) => transformCsv(wideData, skipEmpty),
    onError: (error: Error) => {
      toast.error(`変換に失敗しました: ${error.message}`);
    },
  });
}

/**
 * JSONダウンロード
 */
export const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * CSVダウンロード
 */
export const downloadCsv = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const cell = row[header] === null || row[header] === undefined ? "" : row[header];
          return JSON.stringify(cell); // Escape quotes
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * skip_todayフラグを更新
 */
export function useUpdateSkipToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, skipToday }: { taskId: string; skipToday: boolean }) =>
      updateSkipToday(taskId, skipToday),
    onSuccess: (_, { taskId }) => {
      // 管理タスク一覧を更新
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.managedTasks(0) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.all });
      toast.success(`タスク ${taskId} のスキップ設定を${_.skip_today ? "有効" : "無効"}にしました`);
    },
    onError: (error: Error) => {
      toast.error(`スキップ設定の更新に失敗しました: ${error.message}`);
    },
  });
}

/**
 * 保存済み縦持ちデータを取得
 */
export function useSmartReadLongData(
  configId: number | null,
  taskId?: string,
  limit: number = 1000,
) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.longData(configId ?? 0, taskId),
    queryFn: () =>
      configId
        ? import("./api").then(async (mod) => {
            const res = await mod.getLongData(configId, taskId, limit);
            return res.data;
          })
        : Promise.resolve([]),
    enabled: !!configId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ==================== RequestId/Results Automation Hooks ====================

/**
 * ファイルを自動処理 (process-auto)
 */
export function useProcessFilesAuto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames: string[] }) =>
      processFilesAuto(configId, filenames),
    onSuccess: (result, { configId }) => {
      toast.success(result.message);
      // リクエスト一覧とファイル一覧を更新
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.requests(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.files(configId) });
    },
    onError: (error: Error) => {
      toast.error(`処理開始に失敗しました: ${error.message}`);
    },
  });
}

/**
 * リクエスト一覧を取得 (Polling support)
 */
export function useSmartReadRequests(configId: number | null, limit: number = 100) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.requests(configId ?? 0),
    queryFn: () => (configId ? getRequests(configId, undefined, limit) : { requests: [] }),
    enabled: !!configId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * リクエストのポーリングと状態更新
 */
export function useSmartReadRequestPolling(configId: number | null) {
  const queryClient = useQueryClient();
  // Removed unused completedParams tracking for now

  useQuery({
    queryKey: [...SMARTREAD_QUERY_KEYS.requests(configId ?? 0), "polling"],
    queryFn: async () => {
      if (!configId) return;
      const res = await getRequests(configId, "processing", 100); // Poll only processing items

      // If we need to detect completion, we might need to fetch 'completed' ones too or rely on the list diff
      // For simplicity, let's just re-fetch the main list
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.requests(configId) });

      return res;
    },
    enabled: !!configId,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: true,
  });
}

// Helper: Check IDB cache for task results
async function checkIdbCache(
  configId: number,
  taskId: string,
): Promise<{
  wide_data: Array<Record<string, any>>;
  long_data: Array<Record<string, any>>;
  errors: Array<any>;
  filename: string | null;
  source: "cache";
} | null> {
  try {
    console.info(`[SmartRead] Checking IDB cache...`);
    const { exportCache } = await import("./db/export-cache");
    const cached = await exportCache.getByTaskId(configId, taskId);

    if (cached && cached.long_data.length > 0) {
      console.info(
        `[SmartRead] CACHE HIT! Found ${cached.long_data.length} long rows in IDB. ` +
          `Cached at: ${new Date(cached.cached_at).toLocaleString()}`,
      );
      return {
        wide_data: cached.wide_data,
        long_data: cached.long_data,
        errors: cached.errors,
        filename: cached.filename,
        source: "cache" as const,
      };
    }
    console.info(`[SmartRead] Cache miss or empty.`);
  } catch (e) {
    console.warn(`[SmartRead] Failed to check IDB cache:`, e);
  }
  return null;
}

// Helper: Cache sync result to IDB
async function cacheToIdb(
  configId: number,
  taskId: string,
  res: { wide_data: unknown[]; long_data: unknown[]; errors: unknown[]; filename: string | null },
) {
  if (res.wide_data.length === 0) return;
  try {
    console.info(`[SmartRead] Saving to IDB cache...`);
    const { exportCache } = await import("./db/export-cache");
    await exportCache.set({
      config_id: configId,
      task_id: taskId,
      export_id: `sync_${Date.now()}`,
      wide_data: res.wide_data as Array<Record<string, any>>,
      long_data: res.long_data as Array<Record<string, any>>,
      errors: res.errors as Array<any>,
      filename: res.filename,
    });
    console.info(`[SmartRead] Cached to IDB successfully.`);
  } catch (e) {
    console.error(`[SmartRead] Failed to cache to IDB:`, e);
  }
}

/**
 * タスクの結果を強制的に同期
 */
export function useSyncTaskResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      configId,
      taskId,
      forceSync = false,
    }: {
      configId: number;
      taskId: string;
      forceSync?: boolean;
    }) => {
      console.group(`[SmartRead] Syncing task results for ${taskId}`);
      const startTime = Date.now();

      try {
        // 1. Check IDB cache first (unless forceSync is true)
        if (!forceSync) {
          const cached = await checkIdbCache(configId, taskId);
          if (cached) return cached;
        } else {
          console.info(`[SmartRead] Force sync, skipping cache.`);
        }

        // 2. Trigger backend sync API
        console.info(`[SmartRead] Calling backend sync API (force=${forceSync})...`);
        const res = await syncTaskResults(configId, taskId, forceSync);
        console.info(`[SmartRead] Sync done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

        // === デバッグ: 横持ちデータの内容を表示 ===
        console.info(`[SmartRead] === WIDE DATA DEBUG ===`);
        console.info(`[SmartRead] Wide data count: ${res.wide_data.length}`);
        if (res.wide_data.length > 0) {
          console.info(`[SmartRead] Wide data keys:`, Object.keys(res.wide_data[0]));
          console.info(`[SmartRead] Wide data[0]:`, res.wide_data[0]);
        }
        console.info(`[SmartRead] Long data count from server: ${res.long_data.length}`);

        // === デバッグ: フロントエンドで縦持ち変換を試みる ===
        if (res.wide_data.length > 0 && res.long_data.length === 0) {
          console.warn(
            `[SmartRead] Server returned 0 long rows. Trying frontend transformation...`,
          );
          try {
            const { SmartReadCsvTransformer } = await import("./utils/csv-transformer");
            const transformer = new SmartReadCsvTransformer();

            const frontendResult = transformer.transformToLong(res.wide_data as any[], true);
            console.info(
              `[SmartRead] Frontend transformation result: ${frontendResult.long_data.length} long rows`,
            );
            if (frontendResult.long_data.length > 0) {
              console.info(`[SmartRead] Frontend long data[0]:`, frontendResult.long_data[0]);
              // フロントエンド変換結果を使用
              res.long_data = frontendResult.long_data;
              res.errors = frontendResult.errors;
              console.info(`[SmartRead] Using frontend transformation result instead!`);
            } else {
              console.error(`[SmartRead] Frontend transformation also failed!`);
              console.info(`[SmartRead] Checking DETAIL_FIELDS extraction...`);
              // 明細抽出のデバッグ
              const row = res.wide_data[0];
              const detailFields = [
                "材質コード",
                "材質サイズ",
                "単位",
                "納入量",
                "アイテム",
                "購買",
                "次区",
              ];
              for (const field of detailFields) {
                const keys = [`${field}1`, `${field} 1`, field];
                for (const key of keys) {
                  if (key in (row as Record<string, unknown>)) {
                    console.info(
                      `[SmartRead] Found: "${key}" = "${(row as Record<string, unknown>)[key]}"`,
                    );
                  }
                }
              }
            }
          } catch (e) {
            console.error(`[SmartRead] Frontend transformation error:`, e);
          }
        }
        console.info(`[SmartRead] === END DEBUG ===`);

        // 3. Cache the result
        await cacheToIdb(configId, taskId, res);

        return { ...res, source: "server" as const };
      } catch (e) {
        console.error(`[SmartRead] Sync failed`, e);
        throw e;
      } finally {
        console.groupEnd();
      }
    },
    onSuccess: (res, { configId, taskId }) => {
      const src = res.source === "cache" ? "キャッシュ" : "サーバー";
      toast.success(`${res.long_data.length}件のデータを同期しました (${src})`);

      // 1. 縦持ちデータ(単一タスク)を無効化 -> これで画面がリロードされる
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.longData(configId, taskId) });

      // 2. 全体の縦持ちデータ一覧も念のため無効化
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.longData(configId) });

      // 3. タスク状態（synced_at等）が変わるので管理タスク一覧も更新
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.managedTasks(configId) });
    },
    onError: (error: Error) => {
      toast.error(`データの取得に失敗しました: ${error.message}`);
    },
  });
}
