/**
 * LotAllocationPage.tsx
 *
 * 設計書V2に基づく3ペイン構成のロット引当ページ
 *
 * 構成:
 * - 左ペイン: 受注一覧(優先度バー、KPIバッジ付き)
 * - 中央ペイン: 選択した受注の明細一覧
 * - 右ペイン: 候補ロット一覧と倉庫別配分入力
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { LotAllocationPane } from "../components/LotAllocationPane";
import { OrderDetailPane } from "../components/OrderDetailPane";
import { OrderListPane } from "../components/OrderListPane";
import {
  useWarehouseAllocations,
  useOrderSelection,
  useAutoSelection,
  useAllocationMutation,
  useSnackbar,
  useOrderCards,
} from "../hooks";

import { getOrders, getOrder } from "@/features/orders/api";
import { useLotsQuery, type Lot as CandidateLot } from "@/hooks/useLotsQuery";
import { normalizeOrder } from "@/shared/libs/normalize";
import type { OrderResponse } from "@/shared/types/aliases";
import type { Order } from "../types";

// queryKeyの安定化のため、オブジェクトリテラルを定数化
const QUERY_FILTERS = {
  ORDERS_OPEN: { status: "open" } as const,
} as const;

export function LotAllocationPage() {
  const orderListRef = useRef<HTMLDivElement | null>(null);
  const [_orderListScrollTop, _setOrderListScrollTop] = useState(0);

  // URL状態管理と選択ハンドラー
  const { selectedOrderId, selectedLineId, setSearchParams, handleSelectOrder, handleSelectLine } =
    useOrderSelection();

  // Snackbar管理
  const { snackbar, showSuccess, showError } = useSnackbar();

  // 受注一覧を取得
  const ordersQuery = useQuery<OrderResponse[], Error, Order[]>({
    queryKey: ["orders", QUERY_FILTERS.ORDERS_OPEN],
    queryFn: () => getOrders(QUERY_FILTERS.ORDERS_OPEN),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    select: (data) => (data ?? []).map(normalizeOrder) as Order[],
  });

  // 受注カードデータを作成(フィルタリングとソート)
  const orderCards = useOrderCards(ordersQuery.data);

  // 選択された受注の詳細を取得
  const orderDetailQuery = useQuery({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => getOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  // 自動選択ロジック
  useAutoSelection(
    orderCards,
    selectedOrderId,
    orderDetailQuery.data,
    selectedLineId,
    setSearchParams,
  );

  // 選択された明細行
  const selectedLine = orderDetailQuery.data?.lines?.find((line) => line.id === selectedLineId);

  // ロット候補を取得
  const lotsQuery = useLotsQuery(selectedLine?.product_code || undefined);
  const candidateLots: CandidateLot[] = lotsQuery.data ?? [];

  // 倉庫別配分の状態管理
  const {
    warehouseAllocations,
    setWarehouseAllocations,
    warehouseSummaries,
    allocationList,
    allocationTotalAll,
  } = useWarehouseAllocations(candidateLots, selectedLineId);

  // 引当保存の処理
  const { handleSaveAllocations, canSave } = useAllocationMutation(
    selectedOrderId,
    selectedLineId,
    selectedLine,
    allocationList,
    showSuccess.bind(null, "保存しました"),
    showError,
  );

  // 倉庫配分変更ハンドラー
  const handleWarehouseAllocationChange = useCallback(
    (key: string, value: number) => {
      setWarehouseAllocations((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setWarehouseAllocations],
  );

  // スクロール位置の保存
  useEffect(() => {
    const el = orderListRef.current;
    if (!el) return;

    const handleScroll = () => {
      _setOrderListScrollTop(el.scrollTop);
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左ペイン: 受注一覧 */}
      <OrderListPane
        ref={orderListRef}
        orderCards={orderCards}
        selectedOrderId={selectedOrderId}
        ordersQuery={ordersQuery}
        onSelectOrder={handleSelectOrder}
      />

      {/* 中央ペイン: 明細一覧 */}
      <OrderDetailPane
        selectedOrderId={selectedOrderId}
        orderDetailQuery={orderDetailQuery}
        selectedLineId={selectedLineId}
        allocationTotalAll={allocationTotalAll}
        onSelectLine={handleSelectLine}
      />

      {/* 右ペイン: 候補ロット & 倉庫別配分 */}
      <LotAllocationPane
        selectedLineId={selectedLineId}
        selectedLine={selectedLine}
        lotsQuery={lotsQuery}
        candidateLots={candidateLots}
        warehouseSummaries={warehouseSummaries}
        warehouseAllocations={warehouseAllocations}
        allocationTotalAll={allocationTotalAll}
        canSave={canSave}
        onWarehouseAllocationChange={handleWarehouseAllocationChange}
        onSaveAllocations={handleSaveAllocations}
      />

      {/* Snackbar通知 */}
      {snackbar && (
        <div
          className={`fixed right-6 bottom-6 rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity ${
            snackbar.variant === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {snackbar.message}
        </div>
      )}
    </div>
  );
}
