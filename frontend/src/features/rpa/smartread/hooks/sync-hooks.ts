/**
 * SmartRead Sync Hooks
 *
 * タスク同期・データ取得関連のフック。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { syncTaskResults, getLongData, processFilesAuto } from "../api";
import type { SmartReadCsvDataResponse, SmartReadValidationError } from "../types";

import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

// ============================================
// Types
// ============================================

type SmartReadRow = Record<string, unknown>;

interface SyncResult {
  wide_data: SmartReadRow[];
  long_data: SmartReadRow[];
  errors: SmartReadValidationError[];
  filename: string | null;
  data_version?: number | null;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBodyMessage(body: unknown): string | undefined {
  if (!isObject(body)) return undefined;
  return typeof body.message === "string" ? body.message : undefined;
}

function getBodyState(body: unknown): string | undefined {
  if (!isObject(body)) return undefined;
  return typeof body.state === "string" ? body.state : undefined;
}

function getBodyDataVersion(body: unknown): number | null | undefined {
  if (!isObject(body) || !("data_version" in body)) return undefined;
  const value = body.data_version;
  if (typeof value === "number") return value;
  if (value === null) return null;
  return undefined;
}

function isValidationError(value: unknown): value is SmartReadValidationError {
  if (!isObject(value)) return false;
  return (
    typeof value.row === "number" &&
    typeof value.field === "string" &&
    typeof value.message === "string" &&
    (typeof value.value === "string" || value.value === null)
  );
}

function getBodyValidationErrors(body: unknown): SmartReadValidationError[] {
  if (!isObject(body) || !Array.isArray(body.errors)) return [];
  return body.errors.filter(isValidationError);
}

function getBodyRequestStatus(
  body: unknown,
): Exclude<SyncResult["requests_status"], undefined> | undefined {
  if (!isObject(body) || !isObject(body.requests_status)) return undefined;
  const status = body.requests_status;
  if (
    typeof status.total === "number" &&
    typeof status.completed === "number" &&
    typeof status.running === "number" &&
    typeof status.failed === "number"
  ) {
    return {
      total: status.total,
      completed: status.completed,
      running: status.running,
      failed: status.failed,
    };
  }
  return undefined;
}

function isResponseLike(value: unknown): value is { status: number; json: () => Promise<unknown> } {
  return isObject(value) && typeof value.status === "number" && typeof value.json === "function";
}

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
        data_version: cached.data_version ?? null,
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
  res: SmartReadCsvDataResponse & { task_date?: string },
) {
  if (res.wide_data.length === 0) return;
  try {
    const { exportCache } = await import("../db/export-cache");
    await exportCache.set({
      config_id: configId,
      task_id: taskId,
      export_id: `sync_${Date.now()}`,
      wide_data: res.wide_data,
      long_data: res.long_data,
      errors: res.errors,
      filename: res.filename,
      ...(res.task_date ? { task_date: res.task_date } : {}),
      ...(res.data_version != null ? { data_version: res.data_version } : {}),
      saved_to_db: true,
    });
  } catch {
    // Cache failed
  }
}

async function tryFrontendTransform(
  wideData: SmartReadRow[],
): Promise<{ long_data: SmartReadRow[]; errors: SmartReadValidationError[] } | null> {
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

async function parseHttpError(error: unknown): Promise<{ status: number; body: unknown } | null> {
  if (isObject(error) && "response" in error && isResponseLike(error.response)) {
    const httpError = error.response;
    try {
      const body = await httpError.json();
      return { status: httpError.status, body };
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================
// Hooks
// ============================================

/* eslint-disable max-lines-per-function, complexity -- 論理的な画面単位を維持 */
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
          const frontendResult = await tryFrontendTransform(res.wide_data);
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
              data_version: null,
              source: "server" as const,
              state: "PENDING" as const,
              message: getBodyMessage(body) || "OCR処理中です...",
              ...(getBodyRequestStatus(body)
                ? { requests_status: getBodyRequestStatus(body)! }
                : {}),
            };
          }

          // 422 FAILED
          if (status === 422) {
            return {
              wide_data: [],
              long_data: [],
              errors: getBodyValidationErrors(body),
              filename: null,
              data_version: null,
              source: "server" as const,
              state: "FAILED" as const,
              message: getBodyMessage(body) || "処理に失敗しました",
            };
          }

          // 200 with EMPTY state
          if (status === 200 && getBodyState(body) === "EMPTY") {
            return {
              wide_data: [],
              long_data: [],
              errors: [],
              filename: null,
              data_version: getBodyDataVersion(body) ?? null,
              source: "server" as const,
              state: "EMPTY" as const,
              message: getBodyMessage(body) || "データがありません",
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
export function useSmartReadLongData(configId: number | null, taskId?: string, limit = 1000) {
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
