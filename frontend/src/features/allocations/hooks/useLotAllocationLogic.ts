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
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

import { getAllocationCandidates } from "../api";
import { ALLOCATION_CONSTANTS } from "../constants";
import type { AllocationToastState, LineStatus } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";
import { useOrdersForAllocation } from "./api/useOrdersForAllocation";

import { type Customer } from "@/features/customers/validators/customer-schema";
import { type SupplierProduct } from "@/features/supplier-products/api";
import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";
import { type OrderLine } from "@/shared/types/aliases";

type AllocationsByLine = Record<number, Record<number, number>>;

function useToastAutoClear(
  setToast: Dispatch<SetStateAction<AllocationToastState>>,
  toast: unknown,
) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [setToast, toast]);
}

function useInitializeAllocationState(
  isOrdersLoading: boolean,
  allLines: OrderLine[],
  setAllocationsByLine: Dispatch<SetStateAction<AllocationsByLine>>,
  setLineStatuses: Dispatch<SetStateAction<Record<number, LineStatus>>>,
) {
  useEffect(() => {
    if (isOrdersLoading || !allLines.length) return;

    setAllocationsByLine((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        const reservations = Array.isArray(line.reservations) ? line.reservations : [];
        if (!reservations.length || next[line.id]) return;

        const lineAllocations: Record<number, number> = {};
        reservations.forEach((allocation) => {
          if (!allocation.lot_id) return;
          lineAllocations[allocation.lot_id] = Number(allocation.reserved_qty ?? 0);
        });
        next[line.id] = lineAllocations;
        hasChanges = true;
      });

      return hasChanges ? next : prev;
    });

    setLineStatuses((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        const reservations = Array.isArray(line.reservations) ? line.reservations : [];
        if (!reservations.length) return;
        if (next[line.id] === "committed" || next[line.id] === "draft") return;
        next[line.id] = "committed";
        hasChanges = true;
      });
      return hasChanges ? next : prev;
    });
  }, [allLines, isOrdersLoading, setAllocationsByLine, setLineStatuses]);
}

function useCandidateLotsPrefetch(allLines: OrderLine[]) {
  const candidateQueries = useQueries({
    queries: allLines.map((line) => ({
      queryKey: allocationCandidatesKeys.list({
        order_line_id: line.id,
        supplier_item_id: Number(line.supplier_item_id || 0),
        strategy: "fefo",
        limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
      }),
      queryFn: async () =>
        getAllocationCandidates({
          order_line_id: line.id,
          supplier_item_id: Number(line.supplier_item_id || 0),
          strategy: "fefo",
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        }),
      enabled: !!line.id,
      staleTime: 1000 * 60,
    })),
  });

  return candidateQueries.some((query) => query.isLoading);
}

function buildNameMap<T extends { id: number }>(
  items: T[] | undefined,
  getName: (item: T) => string | null | undefined,
): Record<number, string> {
  if (!items) return {};
  return items.reduce<Record<number, string>>((acc, item) => {
    acc[item.id] = getName(item) ?? "";
    return acc;
  }, {});
}

export function useLotAllocationLogic() {
  const [allocationsByLine, setAllocationsByLine] = useState<AllocationsByLine>({});
  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});
  const [toast, setToast] = useState<AllocationToastState>(null);

  useToastAutoClear(setToast, toast);

  const ordersQuery = useOrdersForAllocation();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const allLines = useMemo(
    () => orders.flatMap((order) => order.lines ?? []) as OrderLine[],
    [orders],
  );

  useInitializeAllocationState(
    ordersQuery.isLoading,
    allLines,
    setAllocationsByLine,
    setLineStatuses,
  );
  const isCandidatesLoading = useCandidateLotsPrefetch(allLines);

  const customersQuery = useCustomersQuery({
    staleTime: 1000 * 60 * 5,
  });

  const productsQuery = useProductsQuery({
    staleTime: 1000 * 60 * 5,
  });

  const customerMap = useMemo(
    () => buildNameMap<Customer>(customersQuery.data, (customer) => customer.customer_name),
    [customersQuery.data],
  );
  const productMap = useMemo(
    () => buildNameMap<SupplierProduct>(productsQuery.data, (product) => product.display_name),
    [productsQuery.data],
  );

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
