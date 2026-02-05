/**
 * Hook to manage the state and data for the Lot Allocation page.
 * Consolidates logic from previous useLotAllocationState, useLotAllocationData, and useLotAllocationComputed.
 *
 * 【設計意図】引当画面の状態管理設計:
 *
 * 1. DBデータからの状態初期化（L44-98）
 *    理由: 「values buried」issue 対応
 *    問題: 以前の実装では、line.reservations（DB既存引当）が画面に反映されなかった
 *    対応:
 *    - useEffect内で、line.reservationsから allocationsByLine を初期化
 *    - line.reservations が存在する場合、lineStatuses を "committed" に設定
 *    → これにより、DBに保存済みの引当が画面表示される
 *
 * 2. hasChanges パターンの採用
 *    理由: useState のセッターを呼ぶと、必ず再レンダリングが発生
 *    → 実際に変更がない場合は、セッターを呼ばない
 *    実装:
 *    - hasChanges フラグで、実際に状態が変わったかを追跡
 *    - 変更がなければ、前の状態（prev）をそのまま返す
 *    メリット: 不要な再レンダリングを防ぐ、パフォーマンス向上
 *
 * 3. useQueries による候補ロットの事前取得
 *    理由: 全明細分の候補ロットを一括フェッチ（prefetch）
 *    → 個別の明細ごとにuseQueryを使うと、複数のリクエストが逐次実行される
 *    → useQueriesは並列実行可能
 *    メリット:
 *    - 画面表示時に全候補ロットが揃っている（ユーザー体験向上）
 *    - 自動引当等の処理が、キャッシュから即座にデータ取得できる
 *
 * 4. useMemo による計算結果のメモ化
 *    対象: orders, allLines, customerMap, productMap
 *    理由: 依存配列が変わらない限り、再計算しない
 *    → 例: customerMap は customersQuery.data が変わらなければ再生成されない
 *    メリット: レンダリングごとに Map を再構築しない、パフォーマンス向上
 *
 * 5. Toast の自動消去（L28-33）
 *    理由: トーストメッセージを5秒後に自動で消す
 *    → useEffect のクリーンアップでタイマーをクリア
 *    → メモリリークを防ぐ
 */

import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getAllocationCandidates } from "../api";
import { ALLOCATION_CONSTANTS } from "../constants";
import type { AllocationToastState, LineStatus } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";
import { useOrdersForAllocation } from "./api/useOrdersForAllocation";

import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function useLotAllocationLogic() {
  // --- State ---
  const [allocationsByLine, setAllocationsByLine] = useState<
    Record<number, Record<number, number>>
  >({});

  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});

  const [toast, setToast] = useState<AllocationToastState>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Data Fetching ---
  const ordersQuery = useOrdersForAllocation();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const allLines = useMemo(() => {
    return orders.flatMap((order) => order.lines ?? []);
  }, [orders]);

  // Initialize state when data is loaded
  useEffect(() => {
    if (ordersQuery.isLoading || !allLines.length) return;

    setAllocationsByLine((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        // Skip initialization if we already have local state for this line
        // (to prevent overwriting user edits if re-fetch happens)
        // However, if we want to sync with DB updates, we might need more complex logic.
        // For now, let's only initialize if empty to be safe, or if we trust re-fetch means current truth.
        // Given the "values buried" issue, simply initializing from DB is key.
        // Let's check if the line has allocations in DB.
        const reservations = Array.isArray(line.reservations) ? line.reservations : [];
        if (reservations.length > 0) {
          const lineAllocs: Record<number, number> = {};
          reservations.forEach((alloc) => {
            // Use lot_id if available
            if (alloc.lot_id) {
              lineAllocs[alloc.lot_id] = Number(alloc.reserved_qty ?? 0);
            }
          });

          // Only update if we don't have this line in state yet OR if the state is empty?
          // The report says "values buried", meaning they exist in DB but not UI.
          // So we should populate.
          if (!next[line.id]) {
            next[line.id] = lineAllocs;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? next : prev;
    });

    setLineStatuses((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        // If we have reservations, and status is not set, set it to "clean" (committed)
        // This implies we have DB data and no unsaved changes yet.
        const reservations = Array.isArray(line.reservations) ? line.reservations : [];
        if (reservations.length > 0) {
          if (next[line.id] !== "committed" && next[line.id] !== "draft") {
            next[line.id] = "committed";
            hasChanges = true;
          }
        }
      });
      return hasChanges ? next : prev;
    });
  }, [ordersQuery.isLoading, allLines]);

  // Prefetch candidate lots for all lines
  const candidateQueries = useQueries({
    queries: allLines.map((line) => ({
      queryKey: allocationCandidatesKeys.list({
        order_line_id: line.id!,
        supplier_item_id: Number(line.supplier_item_id || 0),
        strategy: "fefo",
        limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
      }),
      queryFn: async () => {
        return getAllocationCandidates({
          order_line_id: line.id!,
          supplier_item_id: Number(line.supplier_item_id || 0),
          strategy: "fefo",
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        });
      },
      enabled: !!line.id,
      staleTime: 1000 * 60,
    })),
  });

  const isCandidatesLoading = candidateQueries.some((q) => q.isLoading);

  const customersQuery = useCustomersQuery({
    staleTime: 1000 * 60 * 5,
  });

  const productsQuery = useProductsQuery({
    staleTime: 1000 * 60 * 5,
  });

  // --- Computed ---
  const customerMap = useMemo(() => {
    if (!customersQuery.data) return {};
    return customersQuery.data.reduce(
      (acc, customer) => {
        acc[customer.id] = customer.customer_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [customersQuery.data]);

  const productMap = useMemo(() => {
    if (!productsQuery.data) return {};
    return productsQuery.data.reduce(
      (acc, product) => {
        acc[product.id] = product.display_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [productsQuery.data]);

  return {
    // State
    allocationsByLine,
    setAllocationsByLine,
    lineStatuses,
    setLineStatuses,
    toast,
    setToast,

    // Data
    ordersQuery,
    orders,
    allLines,
    customersQuery,
    productsQuery,
    isCandidatesLoading,

    // Computed
    customerMap,
    productMap,
  };
}
