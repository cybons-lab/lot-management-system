/**
 * Material Delivery Note Hooks
 * TanStack Query hooks for Material Delivery Note operations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "../api";

const QUERY_KEY = "material-delivery-note-runs";

/**
 * Run一覧を取得
 */
export function useRuns(skip = 0, limit = 100) {
  return useQuery({
    queryKey: [QUERY_KEY, skip, limit],
    queryFn: () => getRuns(skip, limit),
  });
}

/**
 * Run詳細を取得
 */
export function useRun(runId: number | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, runId],
    queryFn: () => getRun(runId!),
    enabled: runId !== undefined,
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
    onError: (error: Error) => {
      toast.error(`CSV取込に失敗しました: ${error.message}`);
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
    onError: (error: Error, _variables, context) => {
      if (context?.previousRun) {
        queryClient.setQueryData([QUERY_KEY, runId], context.previousRun);
      }
      toast.error(`更新に失敗しました: ${error.message}`);
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
    onError: (error: Error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
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
      toast.success("全チェックを完了しました");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, runId] });
    },
    onError: (error: Error) => {
      toast.error(`完了処理に失敗しました: ${error.message}`);
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
    onError: (error: Error) => {
      toast.error(`Step2実行に失敗しました: ${error.message}`);
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
    onError: (error: Error) => {
      toast.error(`実行に失敗しました: ${error.message}`);
    },
  });
}

export * from "./useCloudFlow";
export * from "./useLayerCodes";
