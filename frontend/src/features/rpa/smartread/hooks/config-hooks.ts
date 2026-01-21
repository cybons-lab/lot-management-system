/**
 * SmartRead Config Hooks
 *
 * 設定（SmartReadConfig）のCRUD操作用フック。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SmartReadConfigCreate, SmartReadConfigUpdate } from "../api";
import {
  getConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
} from "../api";
import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";
import { ApiError } from "@/utils/errors/custom-errors";

/**
 * 認証エラー時はリトライしない共通retry関数
 */
function authAwareRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return false;
  }
  return failureCount < 1;
}

/**
 * 全設定一覧を取得
 */
export function useSmartReadConfigs() {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.configs(),
    queryFn: getConfigs,
    retry: authAwareRetry,
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
    retry: authAwareRetry,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`設定の作成に失敗しました: ${message}`);
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
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`設定の更新に失敗しました: ${message}`);
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
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`設定の削除に失敗しました: ${message}`);
    },
  });
}
