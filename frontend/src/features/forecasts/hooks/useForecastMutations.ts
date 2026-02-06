/**
 * useForecastMutations.ts
 *
 * フォーキャスト関連のmutations（自動引当、更新、作成）を集約したカスタムフック
 * クエリ無効化処理を一箇所にまとめて重複を排除
 */
/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { bulkAutoAllocate } from "@/features/allocations/api";
import {
  clearGroupSuggestions,
  createForecast,
  deleteForecast,
  regenerateGroupSuggestions,
  updateForecast,
} from "@/features/forecasts/api";
import { logError, logInfo } from "@/services/error-logger";

interface ForecastGroupKey {
  customer_id: number;
  delivery_place_id: number;
  supplier_item_id: number;
}

/**
 * フォーキャスト関連の共通クエリ無効化
 */
function useInvalidateForecastQueries() {
  const queryClient = useQueryClient();

  return (groupKey: ForecastGroupKey) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["forecasts"],
        exact: false,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: ["allocations"],
        exact: false,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "planning-allocation-summary",
          groupKey.customer_id,
          groupKey.delivery_place_id,
          groupKey.supplier_item_id,
        ],
      }),
    ]);
  };
}

/**
 * フォーキャストCRUD操作のmutations
 */
export function useForecastMutations(groupKey: ForecastGroupKey, unit: string) {
  const invalidateQueries = useInvalidateForecastQueries();

  // グループ自動引当（受注明細へのFEFO引当）
  const autoAllocate = useMutation({
    mutationFn: () =>
      bulkAutoAllocate({
        supplier_item_id: groupKey.supplier_item_id,
        customer_id: groupKey.customer_id,
        delivery_place_id: groupKey.delivery_place_id,
      }),
    onSuccess: (result) => {
      logInfo("Forecasts:AutoAllocate", "自動引当を実行しました", {
        ...groupKey,
        allocatedLines: result.allocated_lines,
      });
      if (result.allocated_lines > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      logError(
        "Forecasts:AutoAllocate",
        error instanceof Error ? error : "受注引当に失敗しました",
        {
          ...groupKey,
        },
      );
      toast.error("受注引当に失敗しました");
    },
  });

  // グループ単位の計画引当更新（AllocationSuggestions再生成）
  const regenerateSuggestions = useMutation({
    mutationFn: () =>
      regenerateGroupSuggestions({
        customer_id: groupKey.customer_id,
        delivery_place_id: groupKey.delivery_place_id,
        supplier_item_id: groupKey.supplier_item_id,
      }),
    onSuccess: (result) => {
      const allocated = result.stats.total_allocated_quantity;
      const shortage = result.stats.total_shortage_quantity;
      logInfo("Forecasts:RegenerateSuggestions", "計画引当を更新しました", {
        ...groupKey,
        allocated,
        shortage,
      });
      if (shortage > 0) {
        toast.warning(`計画引当を更新しました（不足: ${shortage}）`);
      } else {
        toast.success(`計画引当を更新しました（引当数量: ${allocated}）`);
      }
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      logError(
        "Forecasts:RegenerateSuggestions",
        error instanceof Error ? error : "計画引当の更新に失敗しました",
        { ...groupKey },
      );
      toast.error("計画引当の更新に失敗しました");
    },
  });

  // グループ単位の計画引当クリア（AllocationSuggestions削除）
  const clearSuggestions = useMutation({
    mutationFn: () =>
      clearGroupSuggestions({
        customer_id: groupKey.customer_id,
        delivery_place_id: groupKey.delivery_place_id,
        supplier_item_id: groupKey.supplier_item_id,
      }),
    onSuccess: (result) => {
      logInfo("Forecasts:ClearSuggestions", "計画引当をクリアしました", { ...groupKey });
      toast.success(result.message);
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      logError(
        "Forecasts:ClearSuggestions",
        error instanceof Error ? error : "計画引当のクリアに失敗しました",
        { ...groupKey },
      );
      toast.error("計画引当のクリアに失敗しました");
    },
  });

  // フォーキャスト更新（0なら削除）
  const update = useMutation({
    mutationFn: async ({ forecastId, quantity }: { forecastId: number; quantity: number }) => {
      if (quantity === 0) {
        await deleteForecast(forecastId);
        return null;
      }
      return updateForecast(forecastId, { forecast_quantity: quantity });
    },
    onSuccess: (_, variables) => {
      const action = variables.quantity === 0 ? "Delete" : "Update";
      logInfo(
        `Forecasts:${action}`,
        `フォーキャストを${action === "Delete" ? "削除" : "更新"}しました`,
        {
          forecastId: variables.forecastId,
          quantity: variables.quantity,
        },
      );
      toast.success(
        variables.quantity === 0 ? "フォーキャストを削除しました" : "フォーキャストを更新しました",
      );
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      logError(
        "Forecasts:Update",
        error instanceof Error ? error : "フォーキャストの操作に失敗しました",
      );
      toast.error("フォーキャストの操作に失敗しました");
    },
  });

  // フォーキャスト新規作成
  const create = useMutation({
    mutationFn: (data: { dateKey: string; quantity: number }) =>
      createForecast({
        customer_id: groupKey.customer_id,
        delivery_place_id: groupKey.delivery_place_id,
        supplier_item_id: groupKey.supplier_item_id,
        forecast_date: data.dateKey,
        forecast_quantity: data.quantity,
        unit: unit,
        forecast_period: data.dateKey.slice(0, 7), // YYYY-MM
      }),
    onSuccess: (result, data) => {
      logInfo("Forecasts:Create", "フォーキャストを作成しました", {
        forecastId: result.id,
        ...groupKey,
        date: data.dateKey,
        quantity: data.quantity,
      });
      toast.success("フォーキャストを作成しました");
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      logError(
        "Forecasts:Create",
        error instanceof Error ? error : "フォーキャストの作成に失敗しました",
        { ...groupKey },
      );
      toast.error("フォーキャストの作成に失敗しました");
    },
  });

  return {
    autoAllocate,
    regenerateSuggestions,
    clearSuggestions,
    update,
    create,
    // ヘルパー関数
    handleUpdateQuantity: (forecastId: number, newQuantity: number) =>
      update.mutateAsync({ forecastId, quantity: newQuantity }),
    handleCreateForecast: (dateKey: string, quantity: number) =>
      create.mutateAsync({ dateKey, quantity }),
    // isPending統合
    isMutating:
      autoAllocate.isPending ||
      regenerateSuggestions.isPending ||
      clearSuggestions.isPending ||
      update.isPending ||
      create.isPending,
  };
}
