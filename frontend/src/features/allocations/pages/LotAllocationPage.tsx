/**
 * LotAllocationPage - ロット引当ページ（完全リファクタリング版）
 *
 * 構成:
 * - 3カラムレイアウト（広い画面）：
 *   - 左カラム: 受注一覧（OrdersPane）
 *   - 中カラム: 明細一覧（OrderLinesPane）
 *   - 右カラム: ロット引当パネル（LotAllocationPanel）
 *
 * レスポンシブ対応:
 * - 広い画面（1280px以上）: 3カラムレイアウト
 * - 中程度の画面（768px〜1280px）: 2カラムレイアウト（受注＋明細を左、ロットを右）
 * - 狭い画面（768px未満）: 明細行内にインライン表示
 *
 * 状態管理:
 * - useState: selectedOrderId, selectedOrderLineId（ページ内ローカル）
 * - useState: lotAllocations（ページ内ローカル引当入力）
 *
 * APIフロー:
 * 1. 受注一覧取得: GET /api/orders
 * 2. 受注詳細取得: GET /api/orders/{order_id}
 * 3. ロット候補取得: GET /api/allocation-candidates?order_line_id=...
 * 4. 引当確定: POST /api/allocations/commit
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useOrdersForAllocation } from "../hooks/useOrdersForAllocation";
import { useOrderDetailForAllocation } from "../hooks/useOrderDetailForAllocation";
import {
  useAllocationCandidates,
  allocationCandidatesKeys,
} from "../hooks/useAllocationCandidates";
import { listCustomers } from "@/services/api/master-service";
import { saveManualAllocations, type ManualAllocationSaveResponse } from "../api";
import { OrdersPane } from "../components/OrdersPane";
import { OrderLinesPane, type OrderLineStockStatus } from "../components/OrderLinesPane";
import { LotAllocationPanel } from "../components/LotAllocationPanel";
import type { CandidateLotItem } from "../api";
import type { OrderLine } from "@/shared/types/aliases";

type SaveAllocationsVariables = {
  orderLineId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
};

export function LotAllocationPage() {
  // ローカル選択状態
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderLineId, setSelectedOrderLineId] = useState<number | null>(null);

  // ローカル引当入力状態
  const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});

  // トースト通知状態
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );
  const queryClient = useQueryClient();

  // レスポンシブ判定（画面幅によるレイアウト切り替え）
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 1280); // 3カラム表示
  const [isMediumScreen, setIsMediumScreen] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1280,
  ); // 2カラム表示

  useEffect(() => {
    const handleResize = () => {
      setIsWideScreen(window.innerWidth >= 1280);
      setIsMediumScreen(window.innerWidth >= 768 && window.innerWidth < 1280);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // API: 受注一覧取得
  const ordersQuery = useOrdersForAllocation();

  // API: 受注詳細取得
  const orderDetailQuery = useOrderDetailForAllocation(selectedOrderId);

  // API: ロット候補取得
  const candidatesQuery = useAllocationCandidates({
    order_line_id: selectedOrderLineId ?? 0,
    strategy: "fefo",
    limit: 200,
  });

  // API: 得意先一覧取得（マッピング用）
  const customersQuery = useQuery({
    queryKey: ["masters", "customers"],
    queryFn: listCustomers,
    staleTime: 1000 * 60 * 5, // 5分
  });

  // 得意先マップ (code -> name)
  const customerMap = useMemo(() => {
    if (!customersQuery.data) return {};
    return customersQuery.data.reduce(
      (acc, customer) => {
        acc[customer.customer_code] = customer.customer_name ?? "";
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [customersQuery.data]);

  // ロット候補リスト
  const candidateLots: CandidateLotItem[] = useMemo(
    () => candidatesQuery.data?.items ?? [],
    [candidatesQuery.data?.items],
  );

  const uiAllocatedSum = useMemo(
    () => Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0),
    [lotAllocations],
  );

  const saveAllocationsMutation = useMutation<
    ManualAllocationSaveResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({
        order_line_id: orderLineId,
        allocations,
      }),
    onSuccess: (response, variables) => {
      setToast({ message: response?.message ?? "引当を登録しました", variant: "success" });
      setLotAllocations({});
      queryClient.invalidateQueries({ queryKey: ["orders", "for-allocation"] });
      if (variables.orderId) {
        queryClient.invalidateQueries({ queryKey: ["order-detail", variables.orderId] });
      }
      queryClient.invalidateQueries({ queryKey: allocationCandidatesKeys.all });
    },
    onError: (error: unknown) => {
      setToast({
        message: error instanceof Error ? error.message : "引当の登録に失敗しました",
        variant: "error",
      });
    },
  });

  const canSaveAllocations = selectedOrderLineId !== null && uiAllocatedSum > 0;
  const isSavingAllocations = saveAllocationsMutation.isPending;
  const allocationPanelCanSave = canSaveAllocations && !isSavingAllocations;

  // 選択中の受注明細
  const selectedOrderLine = useMemo<OrderLine | null>(() => {
    if (!selectedOrderLineId || !orderDetailQuery.data) return null;
    return (
      (orderDetailQuery.data.lines?.find((line) => line.id === selectedOrderLineId) as OrderLine) ||
      null
    );
  }, [selectedOrderLineId, orderDetailQuery.data]);

  // 明細が変わったら引当入力をリセット
  useEffect(() => {
    setLotAllocations({});
  }, [selectedOrderLineId]);

  // ロット候補が変わったら、存在しないロットの入力を除去&上限クリップ
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
        const maxQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);
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

  // 受注選択ハンドラー（先頭明細を自動選択）
  const handleSelectOrder = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);

    // 明細が読み込まれたら先頭を自動選択
    // ここでは orderDetailQuery を使うため、useEffect で処理
  }, []);

  // 明細選択ハンドラー
  const handleSelectOrderLine = useCallback((lineId: number) => {
    setSelectedOrderLineId(lineId);
  }, []);

  // 受注一覧が読み込まれたら最初の受注を自動選択
  useEffect(() => {
    if (ordersQuery.data && ordersQuery.data.length > 0) {
      // 選択中の受注がない、または選択中の受注が一覧に含まれていない場合
      const currentOrderExists = ordersQuery.data.some((order) => order.id === selectedOrderId);
      if (!selectedOrderId || !currentOrderExists) {
        const firstOrderId = ordersQuery.data[0]?.id;
        if (firstOrderId) {
          setSelectedOrderId(firstOrderId);
        }
      }
    }
  }, [ordersQuery.data, selectedOrderId]);

  // 受注詳細が読み込まれたら先頭明細を自動選択
  useEffect(() => {
    if (orderDetailQuery.data?.lines && orderDetailQuery.data.lines.length > 0) {
      const firstLineId = orderDetailQuery.data.lines[0]?.id;
      if (firstLineId) {
        setSelectedOrderLineId(firstLineId);
      }
    } else {
      setSelectedOrderLineId(null);
    }
  }, [orderDetailQuery.data]);

  // ロット引当数量変更ハンドラー
  const handleLotAllocationChange = useCallback(
    (lotId: number, value: number) => {
      const targetLot = candidateLots.find((lot) => lot.lot_id === lotId);
      const maxStock = targetLot
        ? Number(targetLot.free_qty ?? targetLot.current_quantity ?? 0)
        : 0;

      // Calculate remaining needed quantity (Required - Allocated from other lots - DB Allocated)
      const requiredQty = Number(
        selectedOrderLine?.order_quantity ?? selectedOrderLine?.quantity ?? 0,
      );
      const dbAllocated = Number(
        selectedOrderLine?.allocated_qty ?? selectedOrderLine?.allocated_quantity ?? 0,
      );
      const otherLotsAllocated = Object.entries(lotAllocations).reduce((sum, [id, qty]) => {
        return Number(id) === lotId ? sum : sum + qty;
      }, 0);

      const remainingNeeded = Math.max(0, requiredQty - dbAllocated - otherLotsAllocated);

      // Clamp to min(Stock, RemainingNeeded)
      // User cannot enter more than what is needed for the order line
      const maxAllowed = Math.min(maxStock, remainingNeeded);

      const clampedValue = Math.max(0, Math.min(maxAllowed, Number.isFinite(value) ? value : 0));

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

  const handleFillAllFromLot = useCallback(
    (lotId: number) => {
      if (!selectedOrderLine) return;
      const targetLot = candidateLots.find((lot) => lot.lot_id === lotId);
      if (!targetLot) return;

      const requiredQty = Number(
        selectedOrderLine.order_quantity ?? selectedOrderLine.quantity ?? 0,
      );
      const dbAllocated = Number(
        selectedOrderLine.allocated_qty ?? selectedOrderLine.allocated_quantity ?? 0,
      );
      const remainingNeeded = Math.max(0, requiredQty - dbAllocated);
      const availableQty = Number(targetLot.free_qty ?? targetLot.current_quantity ?? 0);
      const maxAllocation = Math.min(remainingNeeded, availableQty);

      setLotAllocations(maxAllocation > 0 ? { [lotId]: maxAllocation } : {});
    },
    [selectedOrderLine, candidateLots],
  );

  // 自動引当（FEFO）ハンドラー
  const handleAutoAllocate = useCallback(() => {
    if (!selectedOrderLine || candidateLots.length === 0) return;

    const orderQty = Number(selectedOrderLine.order_quantity ?? selectedOrderLine.quantity ?? 0);
    const dbAllocatedQty = Number(selectedOrderLine.allocated_qty ?? 0);

    // 残り必要数量 = 受注数量 - DB保存済み引当数量
    let remaining = orderQty - dbAllocatedQty;

    const newAllocations: Record<number, number> = {};

    // FEFO順（既にバックエンドから賞味期限順でソート済み）
    // expiry_date NULLS FIRST でソートされている
    for (const lot of candidateLots) {
      if (remaining <= 0) break;

      const lotId = lot.lot_id;
      const freeQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);
      const allocateQty = Math.min(remaining, freeQty);

      if (allocateQty > 0) {
        newAllocations[lotId] = allocateQty;
        remaining -= allocateQty;
      }
    }

    setLotAllocations(newAllocations);
  }, [selectedOrderLine, candidateLots]);

  // クリアハンドラー
  const handleClearAllocations = useCallback(() => {
    setLotAllocations({});
  }, []);

  // 引当保存ハンドラー
  const handleSaveAllocations = useCallback(() => {
    if (!selectedOrderLineId) return;

    const allocations = Object.entries(lotAllocations)
      .map(([lotIdStr, qty]) => {
        const numericQty = Number(qty);
        return {
          lot_id: Number(lotIdStr),
          quantity: Number.isFinite(numericQty) ? numericQty : 0,
        };
      })
      .filter((item) => item.quantity > 0);

    if (allocations.length === 0) return;

    saveAllocationsMutation.mutate({
      orderLineId: selectedOrderLineId,
      orderId: selectedOrderId,
      allocations,
    });
  }, [selectedOrderLineId, selectedOrderId, lotAllocations, saveAllocationsMutation]);

  // 各明細の在庫状態を計算（在庫不足判定用）
  const lineStockStatus = useMemo<Record<number, OrderLineStockStatus>>(() => {
    const lines = orderDetailQuery.data?.lines ?? [];
    if (!lines.length) return {};

    const statusMap: Record<number, OrderLineStockStatus> = {};
    const canEvaluateSelected = selectedOrderLineId !== null && candidatesQuery.isSuccess;
    const totalAvailableForSelectedLine = canEvaluateSelected
      ? candidateLots.reduce((sum, lot) => {
          const freeQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);
          return sum + Math.max(0, freeQty);
        }, 0)
      : null;

    for (const line of lines) {
      if (!line.id) continue;
      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocated = Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
      const uiAllocated = line.id === selectedOrderLineId ? uiAllocatedSum : 0;
      const totalAllocated = dbAllocated + uiAllocated;
      const remainingQty = Math.max(0, requiredQty - totalAllocated);
      const progress = requiredQty > 0 ? Math.min(100, (totalAllocated / requiredQty) * 100) : 0;
      const totalAvailable = line.id === selectedOrderLineId ? totalAvailableForSelectedLine : null;
      const hasShortage = totalAvailable !== null ? totalAvailable < requiredQty : false;

      statusMap[line.id] = {
        hasShortage,
        totalAvailable,
        requiredQty,
        dbAllocated,
        uiAllocated,
        remainingQty,
        progress,
      };
    }

    return statusMap;
  }, [
    orderDetailQuery.data,
    selectedOrderLineId,
    candidateLots,
    uiAllocatedSum,
    candidatesQuery.isSuccess,
  ]);

  // トースト自動非表示
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // レイアウト判定
  // - isWideScreen (1280px以上): 3カラムレイアウト
  // - isMediumScreen (768px〜1280px): 2カラムレイアウト（受注＋明細 | ロット）
  // - 768px未満: 明細行内にインライン表示
  const renderInlineLots = !isWideScreen && !isMediumScreen;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 広い画面: 3カラムレイアウト（受注 | 明細 | ロット） */}
      {isWideScreen && (
        <>
          {/* 左カラム: 受注一覧 */}
          <div className="w-80">
            <OrdersPane
              orders={ordersQuery.data ?? []}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleSelectOrder}
              customerMap={customerMap}
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
            />
          </div>

          {/* 中カラム: 明細一覧 */}
          <div className="flex-1">
            <OrderLinesPane
              orderLines={orderDetailQuery.data?.lines ?? []}
              selectedOrderLineId={selectedOrderLineId}
              onSelectOrderLine={handleSelectOrderLine}
              orderDetail={orderDetailQuery.data ?? null}
              renderInlineLots={false}
              lineStockStatus={lineStockStatus}
              isLoading={orderDetailQuery.isLoading}
              error={orderDetailQuery.error}
            />
          </div>

          {/* 右カラム: ロット引当パネル */}
          <div className="w-96">
            <LotAllocationPanel
              orderLine={selectedOrderLine}
              candidateLots={candidateLots}
              lotAllocations={lotAllocations}
              onLotAllocationChange={handleLotAllocationChange}
              onFillAllFromLot={handleFillAllFromLot}
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onSaveAllocations={handleSaveAllocations}
              canSave={allocationPanelCanSave}
              layout="sidePane"
              isLoading={candidatesQuery.isLoading}
              error={candidatesQuery.error}
              isSaving={isSavingAllocations}
            />
          </div>
        </>
      )}

      {/* 中程度の画面: 2カラムレイアウト（受注＋明細 | ロット） */}
      {isMediumScreen && (
        <>
          {/* 左カラム: 受注一覧＋明細一覧 */}
          <div className="flex flex-1 flex-col">
            <div className="h-1/2 overflow-hidden border-b">
              <OrdersPane
                orders={ordersQuery.data ?? []}
                selectedOrderId={selectedOrderId}
                onSelectOrder={handleSelectOrder}
                customerMap={customerMap}
                isLoading={ordersQuery.isLoading}
                error={ordersQuery.error}
              />
            </div>
            <div className="h-1/2 overflow-hidden">
              <OrderLinesPane
                orderLines={orderDetailQuery.data?.lines ?? []}
                selectedOrderLineId={selectedOrderLineId}
                onSelectOrderLine={handleSelectOrderLine}
                orderDetail={orderDetailQuery.data ?? null}
                renderInlineLots={false}
                lineStockStatus={lineStockStatus}
                isLoading={orderDetailQuery.isLoading}
                error={orderDetailQuery.error}
              />
            </div>
          </div>

          {/* 右カラム: ロット引当パネル */}
          <div className="w-96">
            <LotAllocationPanel
              orderLine={selectedOrderLine}
              candidateLots={candidateLots}
              lotAllocations={lotAllocations}
              onLotAllocationChange={handleLotAllocationChange}
              onFillAllFromLot={handleFillAllFromLot}
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onSaveAllocations={handleSaveAllocations}
              canSave={allocationPanelCanSave}
              layout="sidePane"
              isLoading={candidatesQuery.isLoading}
              error={candidatesQuery.error}
              isSaving={isSavingAllocations}
            />
          </div>
        </>
      )}

      {/* 狭い画面: インライン表示（768px未満） */}
      {renderInlineLots && (
        <div className="flex flex-1 flex-col">
          <div className="h-1/3 overflow-hidden border-b">
            <OrdersPane
              orders={ordersQuery.data ?? []}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleSelectOrder}
              customerMap={customerMap}
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderLinesPane
              orderLines={orderDetailQuery.data?.lines ?? []}
              selectedOrderLineId={selectedOrderLineId}
              onSelectOrderLine={handleSelectOrderLine}
              orderDetail={orderDetailQuery.data ?? null}
              renderInlineLots={true}
              lineStockStatus={lineStockStatus}
              inlineLotContent={(line) => (
                <LotAllocationPanel
                  orderLine={line}
                  candidateLots={candidateLots}
                  lotAllocations={lotAllocations}
                  onLotAllocationChange={handleLotAllocationChange}
                  onFillAllFromLot={handleFillAllFromLot}
                  onAutoAllocate={handleAutoAllocate}
                  onClearAllocations={handleClearAllocations}
                  onSaveAllocations={handleSaveAllocations}
                  canSave={allocationPanelCanSave}
                  layout="inline"
                  isLoading={candidatesQuery.isLoading}
                  error={candidatesQuery.error}
                  isSaving={isSavingAllocations}
                />
              )}
              isLoading={orderDetailQuery.isLoading}
              error={orderDetailQuery.error}
            />
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toast && (
        <div
          className={`fixed right-6 bottom-6 rounded-lg px-4 py-3 text-sm shadow-lg transition-opacity ${
            toast.variant === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
