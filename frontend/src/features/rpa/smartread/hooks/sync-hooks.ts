/**
 * SmartRead Sync Hooks
 *
 * タスク同期・データ取得関連のフック。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { syncTaskResults, getLongData, processFilesAuto } from "../api";

import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

// ============================================
// Types
// ============================================

interface SyncResult {
  wide_data: Array<Record<string, any>>;
  long_data: Array<Record<string, any>>;
  errors: Array<any>;
  filename: string | null;
  source: "cache" | "server";
  state: "SUCCESS" | "PENDING" | "FAILED" | "EMPTY";
  message?: string;
  requests_status?: {
    total: number;
    completed: number;
    running: number;
    failed: number;
  };
}

// ============================================
// Helper Functions
// ============================================

async function checkIdbCache(
  configId: number,
  taskId: string,
): Promise<Omit<SyncResult, "state"> | null> {
  try {
    const { exportCache } = await import("../db/export-cache");
    const cached = await exportCache.getByTaskId(configId, taskId);

    if (cached && cached.long_data.length > 0) {
      return {
        wide_data: cached.wide_data,
        long_data: cached.long_data,
        errors: cached.errors,
        filename: cached.filename,
        source: "cache" as const,
      };
    }
  } catch {
    // Cache check failed
  }
  return null;
}

async function cacheToIdb(
  configId: number,
  taskId: string,
  res: {
    wide_data: unknown[];
    long_data: unknown[];
    errors: unknown[];
    filename: string | null;
    task_date?: string;
  },
) {
  if (res.wide_data.length === 0) return;
  try {
    const { exportCache } = await import("../db/export-cache");
    await exportCache.set({
      config_id: configId,
      task_id: taskId,
      export_id: `sync_${Date.now()}`,
      wide_data: res.wide_data as Array<Record<string, any>>,
      long_data: res.long_data as Array<Record<string, any>>,
      errors: res.errors as Array<any>,
      filename: res.filename,
      task_date: res.task_date,
      saved_to_db: true,
    });
  } catch {
    // Cache failed
  }
}

async function tryFrontendTransform(
  wideData: Array<Record<string, any>>,
): Promise<{ long_data: Array<Record<string, any>>; errors: Array<any> } | null> {
  if (wideData.length === 0) return null;

  try {
    const { SmartReadCsvTransformer } = await import("../utils/csv-transformer");
    const transformer = new SmartReadCsvTransformer();
    const result = transformer.transformToLong(wideData, true);
    if (result.long_data.length > 0) {
      return result;
    }
  } catch {
    // Transform failed
  }
  return null;
}

async function parseHttpError(error: unknown): Promise<{ status: number; body: any } | null> {
  if (error && typeof error === "object" && "response" in error) {
    const httpError = error as { response: Response };
    try {
      const body = await httpError.response.json();
      return { status: httpError.response.status, body };
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================
// Hooks
// ============================================

/* eslint-disable max-lines-per-function, complexity */
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
    }): Promise<SyncResult> => {
      // 1. Check IDB cache first (unless forceSync is true)
      if (!forceSync) {
        const cached = await checkIdbCache(configId, taskId);
        if (cached) {
          return { ...cached, state: "SUCCESS" as const };
        }
      }

      // 2. Trigger backend sync API
      try {
        const res = await syncTaskResults(configId, taskId, forceSync);

        // If server returned 0 long rows, try frontend transformation
        if (res.wide_data.length > 0 && res.long_data.length === 0) {
          const frontendResult = await tryFrontendTransform(res.wide_data as any[]);
          if (frontendResult) {
            res.long_data = frontendResult.long_data;
            res.errors = frontendResult.errors;
          }
        }

        // 3. Cache the result
        await cacheToIdb(configId, taskId, res);

        return { ...res, source: "server" as const, state: "SUCCESS" as const };
      } catch (error) {
        const parsed = await parseHttpError(error);
        if (parsed) {
          const { status, body } = parsed;

          // 202 PENDING: OCR processing
          if (status === 202) {
            return {
              wide_data: [],
              long_data: [],
              errors: [],
              filename: null,
              source: "server" as const,
              state: "PENDING" as const,
              message: body.message || "OCR処理中です...",
              requests_status: body.requests_status,
            };
          }

          // 422 FAILED
          if (status === 422) {
            return {
              wide_data: [],
              long_data: [],
              errors: body.errors || [],
              filename: null,
              source: "server" as const,
              state: "FAILED" as const,
              message: body.message || "処理に失敗しました",
            };
          }

          // 200 with EMPTY state
          if (status === 200 && body.state === "EMPTY") {
            return {
              wide_data: [],
              long_data: [],
              errors: [],
              filename: null,
              source: "server" as const,
              state: "EMPTY" as const,
              message: body.message || "データがありません",
            };
          }
        }

        throw error;
      }
    },
    onSuccess: (res, { configId, taskId }) => {
      // Show appropriate toast based on state
      if (res.state === "PENDING") {
        toast.info(res.message || "OCR処理中です。しばらくお待ちください...");
        return;
      }

      if (res.state === "FAILED") {
        toast.error(res.message || "処理に失敗しました");
        return;
      }

      if (res.state === "EMPTY") {
        toast.warning(res.message || "データがありません");
        return;
      }

      // SUCCESS
      const src = res.source === "cache" ? "キャッシュ" : "サーバー";
      toast.success(`${res.long_data.length}件のデータを同期しました (${src})`);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.longData(configId, taskId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.longData(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.managedTasks(configId) });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`データの取得に失敗しました: ${message}`);
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
    queryFn: async () => {
      if (!configId) return [];
      const res = await getLongData(configId, taskId, limit);
      return res.data;
    },
    enabled: !!configId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * ファイルを自動処理
 */
export function useProcessFilesAuto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, filenames }: { configId: number; filenames: string[] }) =>
      processFilesAuto(configId, filenames),
    onSuccess: (result, { configId }) => {
      const successCount = result.filter((item) => item.success).length;
      const totalCount = result.length;
      toast.success(`${totalCount}件の処理を開始しました（成功: ${successCount}件）`);
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.requests(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.files(configId) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.managedTasks(configId) });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`処理開始に失敗しました: ${message}`);
    },
  });
}
