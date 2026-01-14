/**
 * SmartRead OCR TanStack Query hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  SmartReadConfig,
  SmartReadConfigCreate,
  SmartReadConfigUpdate,
  SmartReadAnalyzeResponse,
} from "./api";
import {
  getConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  analyzeFile,
} from "./api";

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
