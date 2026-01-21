/**
 * Material Delivery Note Hooks
 * TanStack Query hooks for Material Delivery Note operations
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  completeAllItems,
  createRun,
  executeStep2,
  getRun,
  getRuns,
  updateItem,
  executeMaterialDeliveryNote,
  batchUpdateItems,
  type MaterialDeliveryNoteExecuteRequest,
  type Step2ExecuteRequest,
  type RpaRun,
  type RpaRunListResponse,
  type ActivityItem,
  type LoopSummary,
  type RpaRunItem,
  getActivity,
  getLoopSummary,
  getFailedItems,
  getRunEvents,
  pauseRun,
  resumeRun,
  cancelRun,
  downloadFailedItems,
  type RpaRunEvent,
} from "../api";

import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

const QUERY_KEY = "material-delivery-note-runs";

/**
 * Run一覧を取得
 */
export function useRuns(
  skip = 0,
  limit = 100,
  options?: Partial<UseQueryOptions<RpaRunListResponse, Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, skip, limit],
    queryFn: () => getRuns(skip, limit),
    ...options,
  });
}

/**
 * Run詳細を取得
 */
export function useRun(
  runId: number | undefined,
  options?: Partial<UseQueryOptions<RpaRun, Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, runId],
    queryFn: () => getRun(runId!),
    enabled: runId !== undefined && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * PADループ集計を取得
 */
export function useLoopSummary(
  runId: number | undefined,
  options?: Partial<UseQueryOptions<LoopSummary, Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, runId, "loop-summary"],
    queryFn: () => getLoopSummary(runId!),
    enabled: runId !== undefined && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * PADループ活動ログを取得
 */
export function useActivity(
  runId: number | undefined,
  limit = 50,
  options?: Partial<UseQueryOptions<ActivityItem[], Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, runId, "activity", limit],
    queryFn: () => getActivity(runId!, limit),
    enabled: runId !== undefined && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Runイベント取得
 */
export function useRunEvents(
  runId: number | undefined,
  limit = 100,
  options?: Partial<UseQueryOptions<RpaRunEvent[], Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, runId, "events", limit],
    queryFn: () => getRunEvents(runId!, limit),
    enabled: runId !== undefined && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * 失敗アイテム一覧
 */
export function useFailedItems(
  runId: number | undefined,
  options?: Partial<UseQueryOptions<RpaRunItem[], Error>>,
) {
  return useQuery({
    queryKey: [QUERY_KEY, runId, "failed-items"],
    queryFn: () => getFailedItems(runId!),
    enabled: runId !== undefined && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Run一時停止
 */
export function usePauseRun(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pauseRun(runId),
    onSuccess: () => {
      toast.success("Runを一時停止しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId, "events"] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`一時停止に失敗しました: ${message}`);
    },
  });
}

/**
 * Run再開
 */
export function useResumeRun(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resumeRun(runId),
    onSuccess: () => {
      toast.success("Runを再開しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId, "events"] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`再開に失敗しました: ${message}`);
    },
  });
}

/**
 * Run中断
 */
export function useCancelRun(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelRun(runId),
    onSuccess: () => {
      toast.success("Runを中断しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId, "events"] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`中断に失敗しました: ${message}`);
    },
  });
}

/**
 * 失敗アイテムのExcel出力
 */
export function useDownloadFailedItems(runId: number) {
  return useMutation({
    mutationFn: () => downloadFailedItems(runId),
    onSuccess: () => {
      toast.success("Excelをダウンロードしました");
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`Excel出力に失敗しました: ${message}`);
    },
  });
}

/**
 * CSVファイルをアップロードしてRunを作成
 */
export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => createRun(file),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`CSV取込に失敗しました: ${message}`);
    },
  });
}

/**
 * Itemを更新
 */
export function useUpdateItem(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: number;
      data: {
        issue_flag?: boolean;
        complete_flag?: boolean;
        delivery_quantity?: number;
      };
    }) => updateItem(runId, itemId, data),
    onMutate: async ({ itemId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, runId] });

      // Snapshot the previous value
      const previousRun = queryClient.getQueryData<RpaRun>([QUERY_KEY, runId]);

      // Optimistically update to the new value
      queryClient.setQueryData<RpaRun>([QUERY_KEY, runId], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) => (item.id === itemId ? { ...item, ...data } : item)),
        };
      });

      // Return a context object with the snapshotted value
      return { previousRun };
    },
    onError: async (error: Error, _variables, context) => {
      if (context?.previousRun) {
        queryClient.setQueryData([QUERY_KEY, runId], context.previousRun);
      }
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`更新に失敗しました: ${message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
    },
  });
}

/**
 * Itemsを一括更新
 */
export function useBatchUpdateItems(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemIds,
      data,
    }: {
      itemIds: number[];
      data: {
        issue_flag?: boolean;
        complete_flag?: boolean;
        delivery_quantity?: number;
      };
    }) => batchUpdateItems(runId, itemIds, data),
    onSuccess: () => {
      toast.success("一括更新しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`更新に失敗しました: ${message}`);
    },
  });
}

/**
 * 全Itemsを完了にする
 */
export function useCompleteAllItems(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeAllItems(runId),
    onSuccess: () => {
      toast.success("Step2を完了しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`完了処理に失敗しました: ${message}`);
    },
  });
}

/**
 * Step2を実行
 */
export function useExecuteStep2(runId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Step2ExecuteRequest) => executeStep2(runId, request),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`Step2実行に失敗しました: ${message}`);
    },
  });
}

/**
 * Power Automateフロー呼び出し（素材納品書発行）
 */
export function useExecuteMaterialDeliveryNote() {
  return useMutation({
    mutationFn: (request: MaterialDeliveryNoteExecuteRequest) =>
      executeMaterialDeliveryNote(request),
    onSuccess: (data) => {
      if (data.status === "success") {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: async (error: Error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`実行に失敗しました: ${message}`);
    },
  });
}

export * from "./useCloudFlow";
export * from "./useLayerCodes";
