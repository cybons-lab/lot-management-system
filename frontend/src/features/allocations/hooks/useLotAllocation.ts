import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useOrdersForAllocation } from "./useOrdersForAllocation";
import { useOrderDetailForAllocation } from "./useOrderDetailForAllocation";
import { useAllocationCandidates, allocationCandidatesKeys } from "./useAllocationCandidates";
import { listCustomers } from "@/services/api/master-service";
import { saveManualAllocations, type ManualAllocationSaveResponse } from "../api";
import type { CandidateLotItem } from "../api";
import type { OrderLine } from "@/shared/types/aliases";
import type { OrderLineStockStatus } from "../components/OrderLinesPane";

type SaveAllocationsVariables = {
  orderLineId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
};

export function useLotAllocation() {
  const queryClient = useQueryClient();

  // ----------------------------------------------------------------
  // 1. 状態管理 (State)
  // ----------------------------------------------------------------
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderLineId, setSelectedOrderLineId] = useState<number | null>(null);
  const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );

  // ----------------------------------------------------------------
  // 2. データ取得 (Queries)
  // ----------------------------------------------------------------
  const ordersQuery = useOrdersForAllocation();
  const orderDetailQuery = useOrderDetailForAllocation(selectedOrderId);

  const candidatesQuery = useAllocationCandidates({
    order_line_id: selectedOrderLineId ?? 0,
    strategy: "fefo",
    limit: 200,
  });

  const customersQuery = useQuery({
    queryKey: ["masters", "customers"],
    queryFn: listCustomers,
    staleTime: 1000 * 60 * 5,
  });

  const saveAllocationsMutation = useMutation<
    ManualAllocationSaveResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({ order_line_id: orderLineId, allocations }),
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

  // ----------------------------------------------------------------
  // 3. データ加工・計算 (Computed)
  // ----------------------------------------------------------------

  // 得意先マップ
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

  // UI上の引当合計
  const uiAllocatedSum = useMemo(
    () => Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0),
    [lotAllocations],
  );

  // 選択中の明細詳細
  const selectedOrderLine = useMemo<OrderLine | null>(() => {
    if (!selectedOrderLineId || !orderDetailQuery.data) return null;
    return (
      (orderDetailQuery.data.lines?.find((line) => line.id === selectedOrderLineId) as OrderLine) ||
      null
    );
  }, [selectedOrderLineId, orderDetailQuery.data]);

  // 過剰引当・残り数量チェック
  const { isOverAllocated, remainingQty } = useMemo(() => {
    if (!selectedOrderLine) return { isOverAllocated: false, remainingQty: 0 };
    const requiredQty = Number(selectedOrderLine.order_quantity ?? selectedOrderLine.quantity ?? 0);
    const dbAllocated = Number(
      selectedOrderLine.allocated_qty ?? selectedOrderLine.allocated_quantity ?? 0,
    );
    const totalAllocated = dbAllocated + uiAllocatedSum;
    const remaining = requiredQty - totalAllocated;
    return { isOverAllocated: remaining < 0, remainingQty: remaining };
  }, [selectedOrderLine, uiAllocatedSum]);

  // 保存可能かどうか
  const canSaveAllocations = selectedOrderLineId !== null && uiAllocatedSum > 0 && !isOverAllocated;
  const isSavingAllocations = saveAllocationsMutation.isPending;

  // 各明細の在庫ステータス計算
  const lineStockStatus = useMemo<Record<number, OrderLineStockStatus>>(() => {
    const lines = orderDetailQuery.data?.lines ?? [];
    if (!lines.length) return {};

    const statusMap: Record<number, OrderLineStockStatus> = {};
    const canEvaluateSelected = selectedOrderLineId !== null && candidatesQuery.isSuccess;
    const totalAvailableForSelectedLine = canEvaluateSelected
      ? candidateLots.reduce(
          (sum, lot) => sum + Math.max(0, Number(lot.free_qty ?? lot.current_quantity ?? 0)),
          0,
        )
      : null;

    for (const line of lines) {
      if (!line.id) continue;
      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocated = Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
      const uiAllocated = line.id === selectedOrderLineId ? uiAllocatedSum : 0;
      const totalAllocated = dbAllocated + uiAllocated;
      const remainingQty = Math.max(0, requiredQty - totalAllocated);
      const progress = requiredQty > 0 ? Math.min(100, (totalAllocated / requiredQty) * 100) : 0;

      // 選択中明細以外は在庫チェックを簡易化（またはAPI未取得のためnull）
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

  // ----------------------------------------------------------------
  // 4. 副作用 (Effects)
  // ----------------------------------------------------------------

  // 明細変更時に引当入力をリセット
  useEffect(() => {
    setLotAllocations({});
  }, [selectedOrderLineId]);

  // ロット候補変更時に不正な入力を除去＆クリップ
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
        if (clampedQty !== prevQty) changed = true;
      }
      return changed || Object.keys(prev).length !== Object.keys(next).length ? next : prev;
    });
  }, [candidateLots]);

  // 初期ロード時の自動選択
  useEffect(() => {
    if (
      ordersQuery.data?.length &&
      (!selectedOrderId || !ordersQuery.data.some((o) => o.id === selectedOrderId))
    ) {
      setSelectedOrderId(ordersQuery.data[0].id);
    }
  }, [ordersQuery.data, selectedOrderId]);

  useEffect(() => {
    if (orderDetailQuery.data?.lines?.length) {
      setSelectedOrderLineId(orderDetailQuery.data.lines[0].id);
    } else {
      setSelectedOrderLineId(null);
    }
  }, [orderDetailQuery.data]);

  // トースト自動消去
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ----------------------------------------------------------------
  // 5. アクションハンドラー (Actions)
  // ----------------------------------------------------------------

  const handleLotAllocationChange = useCallback(
    (lotId: number, value: number) => {
      const targetLot = candidateLots.find((lot) => lot.lot_id === lotId);
      const maxAllowed = targetLot
        ? Number(targetLot.free_qty ?? targetLot.current_quantity ?? 0)
        : 0;
      const clampedValue = Math.max(0, Math.min(maxAllowed, Number.isFinite(value) ? value : 0));

      setLotAllocations((prev) => {
        if (clampedValue === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [lotId]: _, ...rest } = prev;
          return rest;
        }
        return prev[lotId] === clampedValue ? prev : { ...prev, [lotId]: clampedValue };
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

  const handleAutoAllocate = useCallback(() => {
    if (!selectedOrderLine || !candidateLots.length) return;
    const orderQty = Number(selectedOrderLine.order_quantity ?? selectedOrderLine.quantity ?? 0);
    const dbAllocatedQty = Number(selectedOrderLine.allocated_qty ?? 0);
    let remaining = orderQty - dbAllocatedQty;
    const newAllocations: Record<number, number> = {};

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

  const handleSaveAllocations = useCallback(() => {
    if (!selectedOrderLineId || isOverAllocated) return;
    const allocations = Object.entries(lotAllocations)
      .map(([lotIdStr, qty]) => ({ lot_id: Number(lotIdStr), quantity: Number(qty) }))
      .filter((item) => item.quantity > 0);

    if (allocations.length) {
      saveAllocationsMutation.mutate({
        orderLineId: selectedOrderLineId,
        orderId: selectedOrderId,
        allocations,
      });
    }
  }, [
    selectedOrderLineId,
    selectedOrderId,
    lotAllocations,
    saveAllocationsMutation,
    isOverAllocated,
  ]);

  return {
    // Data
    selectedOrderId,
    selectedOrderLineId,
    selectedOrderLine,
    orders: ordersQuery.data ?? [],
    orderDetail: orderDetailQuery.data ?? null,
    orderLines: orderDetailQuery.data?.lines ?? [],
    candidateLots,
    customerMap,
    lotAllocations,
    lineStockStatus,
    isOverAllocated,
    remainingQty,
    toast,

    // Status flags
    isLoadingOrders: ordersQuery.isLoading,
    isLoadingDetail: orderDetailQuery.isLoading,
    isLoadingCandidates: candidatesQuery.isLoading,
    isSavingAllocations,
    canSaveAllocations: canSaveAllocations && !isSavingAllocations,
    ordersError: ordersQuery.error,
    detailError: orderDetailQuery.error,
    candidatesError: candidatesQuery.error,

    // Actions
    selectOrder: setSelectedOrderId,
    selectOrderLine: setSelectedOrderLineId,
    changeAllocation: handleLotAllocationChange,
    fillAllFromLot: handleFillAllFromLot,
    autoAllocate: handleAutoAllocate,
    clearAllocations: () => setLotAllocations({}),
    saveAllocations: handleSaveAllocations,
  };
}
