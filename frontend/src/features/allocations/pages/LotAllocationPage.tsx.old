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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LotAllocationPane } from "../components/LotAllocationPane";
import { OrderDetailPane } from "../components/OrderDetailPane";
import { OrderListPane } from "../components/OrderListPane";
import {
  useOrderSelection,
  useAutoSelection,
  useAllocationMutation,
  useSnackbar,
  useOrderCards,
} from "../hooks";
import type { Order } from "../types";
import { toQty } from "../utils/qty";

import type { AllocationInputItem, CandidateLotItem } from "@/features/allocations/api";
import { useAllocationCandidates } from "@/features/allocations/hooks/useAllocationCandidates";
import { getOrders, getOrder } from "@/features/orders/api";
import { normalizeOrder } from "@/shared/libs/normalize";
import type { OrderResponse } from "@/shared/types/aliases";

export function LotAllocationPage() {
  const orderListRef = useRef<HTMLDivElement | null>(null);
  const [_orderListScrollTop, _setOrderListScrollTop] = useState(0);

  // URL状態管理と選択ハンドラー
  const { selectedOrderId, selectedLineId, setSearchParams, handleSelectOrder, handleSelectLine } =
    useOrderSelection();

  // Snackbar管理
  const { snackbar, showSuccess, showError } = useSnackbar();

  // 受注一覧を取得（openと引当済みの両方を表示）
  const ordersQuery = useQuery<OrderResponse[], Error, Order[]>({
    queryKey: ["orders", "all-for-allocation"],
    queryFn: () => getOrders(), // ステータスフィルタなしで全受注を取得
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    select: (data) => (data ?? []).map(normalizeOrder) as Order[],
  });

  // 受注カードデータを作成(フィルタリングとソート)
  const orderCards = useOrderCards(ordersQuery.data);

  // 選択された受注の詳細を取得
  const orderDetailQuery = useQuery<unknown, Error, Order>({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => getOrder(selectedOrderId!),
    enabled: !!selectedOrderId,
    // 取得スキーマ（line_noがnull可など）が広いので、selectでUI用Orderへ正規化
    select: (data) => normalizeOrder(data as OrderResponse) as Order,
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
  const normalizedSelectedLineId =
    selectedLineId != null && Number.isFinite(Number(selectedLineId))
      ? Number(selectedLineId)
      : null;

  const selectedLine =
    normalizedSelectedLineId != null
      ? orderDetailQuery.data?.lines?.find((line) => Number(line.id) === normalizedSelectedLineId)
      : undefined;

  // ロット候補を取得（新API: /allocation-candidates）
  const lotsQuery = useAllocationCandidates({
    order_line_id: normalizedSelectedLineId ?? 0,
    strategy: "fefo",
    limit: 200,
  });

  const candidateLots: CandidateLotItem[] = useMemo(
    () => lotsQuery.data?.items ?? [],
    [lotsQuery.data?.items],
  );

  // ロット単位の配分状態
  const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});
  const lastSelectedLineIdRef = useRef<number | null>(null);

  // 明細が切り替わったら入力をリセット
  useEffect(() => {
    if (!selectedLineId) {
      setLotAllocations({});
      lastSelectedLineIdRef.current = null;
      return;
    }

    if (lastSelectedLineIdRef.current !== Number(selectedLineId)) {
      setLotAllocations({});
      lastSelectedLineIdRef.current = Number(selectedLineId);
    }
  }, [selectedLineId]);

  // 候補ロットの変化に応じて存在しないロットの入力を除去&上限クリップ
  useEffect(() => {
    if (!candidateLots.length) {
      setLotAllocations((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    setLotAllocations((prev) => {
      const next: Record<number, number> = {};
      let changed = false;

      for (const lot of candidateLots) {
        const lotId = lot.lot_id;
        if (!lotId) continue;

        const maxQty = toQty(lot.free_qty ?? 0);
        const prevQty = prev[lotId] ?? 0;
        const clampedQty = Math.min(Math.max(prevQty, 0), maxQty);

        next[lotId] = clampedQty;
        if (clampedQty !== prevQty) {
          changed = true;
        }
      }

      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [candidateLots]);

  const allocationList: AllocationInputItem[] = useMemo(() => {
    return candidateLots
      .map<AllocationInputItem | null>((lot) => {
        const lotId = lot.lot_id;
        if (!lotId) return null;

        const quantity = Number(lotAllocations[lotId] ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0) return null;

        return {
          lotId,
          lot: null,
          delivery_place_id: null,
          delivery_place_code: null,
          quantity,
        };
      })
      .filter((item): item is AllocationInputItem => item !== null);
  }, [candidateLots, lotAllocations]);

  const allocationTotalAll = useMemo(
    () => allocationList.reduce((sum, allocation) => sum + allocation.quantity, 0),
    [allocationList],
  );

  // 引当保存の処理
  const { handleSaveAllocations, canSave } = useAllocationMutation(
    selectedOrderId,
    selectedLineId,
    selectedLine,
    allocationList,
    showSuccess.bind(null, "保存しました"),
    showError,
  );

  // ロット配分変更ハンドラー
  const handleLotAllocationChange = useCallback(
    (lotId: number, value: number) => {
      const targetLot = candidateLots.find((lot) => lot.lot_id === lotId);
      const maxQty = targetLot ? toQty(targetLot.free_qty ?? 0) : Number.POSITIVE_INFINITY;

      const clampedValue = Math.max(0, Math.min(maxQty, Number.isFinite(value) ? value : 0));

      setLotAllocations((prev) => {
        if (clampedValue === 0) {
          if (!(lotId in prev)) return prev;
          const { [lotId]: _omit, ...rest } = prev;
          return rest;
        }

        if (prev[lotId] === clampedValue) return prev;
        return { ...prev, [lotId]: clampedValue };
      });
    },
    [candidateLots],
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
        selectedLineId={normalizedSelectedLineId}
        selectedLine={selectedLine}
        isLoading={lotsQuery.isLoading}
        error={lotsQuery.error ?? null}
        candidateLots={candidateLots}
        lotAllocations={lotAllocations}
        allocationTotalAll={allocationTotalAll}
        canSave={canSave}
        onLotAllocationChange={handleLotAllocationChange}
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
