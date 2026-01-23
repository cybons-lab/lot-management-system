/**
 * SmartRead Task Hooks
 *
 * タスク管理関連のフック。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getTasks, getManagedTasks, updateSkipToday, getRequests } from "../api";

import { SMARTREAD_QUERY_KEYS } from "./query-keys";

import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

/**
 * タスク一覧を取得 (SmartRead API)
 * NOTE: 主に "Sync" ボタンから手動で呼び出されることを想定
 */
export function useSmartReadTasks(configId: number | null, enabled: boolean = false) {
  return useQuery({
    queryKey: SMARTREAD_QUERY_KEYS.tasks(configId ?? 0),
    queryFn: async () => {
      if (!configId) return { tasks: [] };
      return getTasks(configId);
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
      return getManagedTasks(configId);
    },
    enabled: !!configId && enabled,
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });
}

/**
 * skip_todayフラグを更新
 */
export function useUpdateSkipToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, skipToday }: { taskId: string; skipToday: boolean }) =>
      updateSkipToday(taskId, skipToday),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.managedTasks(0) });
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.all });
      toast.success(
        `タスク ${result.task_id} のスキップ設定を${result.skip_today ? "有効" : "無効"}にしました`,
      );
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`スキップ設定の更新に失敗しました: ${message}`);
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

  useQuery({
    queryKey: [...SMARTREAD_QUERY_KEYS.requests(configId ?? 0), "polling"],
    queryFn: async () => {
      if (!configId) return;
      const res = await getRequests(configId, "processing", 100);
      queryClient.invalidateQueries({ queryKey: SMARTREAD_QUERY_KEYS.requests(configId) });
      return res;
    },
    enabled: !!configId,
    refetchInterval: authAwareRefetchInterval(5000), // Poll every 5 seconds
    refetchIntervalInBackground: true,
  });
}
