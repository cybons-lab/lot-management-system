/**
 * SmartRead OCR TanStack Query hooks
 */

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
  createExport,
  getExportStatus,
  getExportCsvData,
  transformCsv,
} from "./api";

import { ApiError } from "@/utils/errors/custom-errors";

// Query keys
const QUERY_KEYS = {
  all: ["smartread"] as const,
  configs: () => [...QUERY_KEYS.all, "configs"] as const,
  config: (id: number) => [...QUERY_KEYS.configs(), id] as const,
};

/**
 * 全設定一覧を取得
 */
export function useSmartReadConfigs() {
  return useQuery({
    queryKey: QUERY_KEYS.configs(),
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
    queryKey: QUERY_KEYS.config(configId),
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configs() });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config(configId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configs() });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configs() });
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
    queryKey: [...QUERY_KEYS.config(configId ?? 0), "files"],
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
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.config(configId), "files"] });
    },
    onError: (error: Error) => {
      toast.error(`処理に失敗しました: ${error.message}`);
    },
  });
}

// ==================== タスク・Export ====================

/**
 * タスク一覧を取得
 */
export function useSmartReadTasks(configId: number | null, enabled: boolean = false) {
  return useQuery({
    queryKey: configId ? [...QUERY_KEYS.config(configId), "tasks"] : [],
    queryFn: () => (configId ? getTasks(configId) : Promise.resolve({ tasks: [] })),
    enabled: !!configId && enabled,
    staleTime: Infinity, // キャッシュを永続化（手動更新のみ）
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
        ? [...QUERY_KEYS.config(configId), "export", taskId, exportId]
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
 * エクスポートからCSVデータを取得
 */
export function useExportCsvData(
  configId: number | null,
  taskId: string | null,
  exportId: string | null,
  isExportDone: boolean = false,
) {
  return useQuery({
    queryKey:
      configId && taskId && exportId
        ? [...QUERY_KEYS.config(configId), "csv", taskId, exportId]
        : [],
    queryFn: () =>
      configId && taskId && exportId
        ? getExportCsvData(configId, taskId, exportId)
        : Promise.resolve(null),
    enabled: !!configId && !!taskId && !!exportId && isExportDone,
    staleTime: 1000 * 60 * 10, // CSVデータは10分キャッシュ
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
