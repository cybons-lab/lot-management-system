/**
 * Hook to save allocations to the backend
 *
 * 【設計意図】引当保存処理の設計判断:
 *
 * 1. useMutationを使う理由
 *    理由: データ変更操作（POST/PUT）は useMutation が適切
 *    → useQueryは読み取り専用（GET）のデータフェッチ用
 *    → useMutationは、成功/失敗時のコールバック（onSuccess/onError）が充実
 *
 * 2. invalidateQueries の実行タイミング
 *    理由: 保存成功後、関連するクエリを無効化して再取得
 *    対象:
 *    - ["orders", "for-allocation"]: 受注一覧を再取得し、allocations情報を最新化
 *    - allocationCandidatesKeys.list(...): 候補ロット一覧を再取得（在庫数が変わるため）
 *    → これにより、保存後の画面表示が最新のDBデータと一致
 *
 * 3. setLineStatusToCommitted の呼び出し
 *    理由: 保存成功後、明細のステータスを "committed"（確定済み）に変更
 *    → "draft"（下書き）から "committed" への状態遷移
 *    → ユーザーは「保存済み」であることを視覚的に確認できる
 *
 * 4. useCallback によるメモ化
 *    理由: saveAllocations関数は、依存配列が変わらない限り再生成されない
 *    → 子コンポーネントに渡す際、不要な再レンダリングを防ぐ
 *
 * 5. 過剰引当チェック（isOverAllocated）
 *    理由: 保存前に、受注数量を超えていないかをチェック
 *    → 超過している場合はエラートーストを表示し、保存を中止
 *    → バックエンドでもチェックするが、フロントエンドで事前に防ぐことでUX向上
 */

import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { saveManualAllocations, type ManualAllocationBatchResponse } from "../api";
import { ALLOCATION_CONSTANTS } from "../constants";
import { setLineStatusToCommitted } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, AllocationToastState, LineStatusMap } from "../types";
import { convertAllocationsToPayload, getOrderId } from "../utils/allocationCalculations";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";

import type { OrderLine } from "@/shared/types/aliases";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

/**
 * Variables for saveAllocations mutation
 */
interface SaveAllocationsVariables {
  orderLineId: number;
  productId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
}

/**
 * Hook to save allocations to the backend
 * @param options - Save options including all required dependencies
 * @returns Save handler and mutation object
 */
export function useAllocationSaver({
  queryClient,
  allLines,
  allocationsByLine,
  setLineStatuses,
  setToast,
  isOverAllocated,
}: {
  queryClient: QueryClient;
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
  setToast: React.Dispatch<React.SetStateAction<AllocationToastState>>;
  isOverAllocated: (lineId: number) => boolean;
}) {
  // Mutation for saving allocations
  const saveAllocationsMutation = useMutation<
    ManualAllocationBatchResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({ order_line_id: orderLineId, allocations }),
    onSuccess: (response, variables) => {
      // Show success toast
      setToast({
        message: response?.message ?? ALLOCATION_CONSTANTS.MESSAGES.SAVE_SUCCESS,
        variant: "success",
      });

      // Mark line as committed
      setLineStatusToCommitted(variables.orderLineId, setLineStatuses);

      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["orders", "for-allocation"] });
      queryClient.invalidateQueries({
        queryKey: allocationCandidatesKeys.list({
          order_line_id: variables.orderLineId,
          product_group_id: variables.productId,
          strategy: ALLOCATION_CONSTANTS.QUERY_STRATEGY.FEFO,
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        }),
      });
    },
    onError: async (error: unknown) => {
      // Show error toast with user-friendly message
      const message = await getUserFriendlyMessageAsync(error);
      setToast({
        message,
        variant: "error",
      });
    },
  });

  // Save allocations handler
  const saveAllocations = useCallback(
    (lineId: number) => {
      const allocationsMap = allocationsByLine[lineId] ?? {};
      const line = allLines.find((l) => l.id === lineId);

      // Early return if line not found
      if (!line) return;

      // Check for over-allocation
      if (isOverAllocated(lineId)) {
        setToast({
          message: ALLOCATION_CONSTANTS.MESSAGES.OVER_ALLOCATED,
          variant: "error",
        });
        return;
      }

      // Convert allocations to API payload format
      const allocations = convertAllocationsToPayload(allocationsMap);

      // Execute mutation
      saveAllocationsMutation.mutate({
        orderLineId: lineId,
        productId: Number(line.product_group_id || 0),
        orderId: getOrderId(line),
        allocations,
      });
    },
    [allocationsByLine, allLines, isOverAllocated, saveAllocationsMutation, setToast],
  );

  return { saveAllocations, saveAllocationsMutation };
}
