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
import { useOrdersForAllocation } from "../hooks/useOrdersForAllocation";
import { useOrderDetailForAllocation } from "../hooks/useOrderDetailForAllocation";
import { useAllocationCandidates } from "../hooks/useAllocationCandidates";
import { useCommitAllocationMutation } from "../hooks/useCommitAllocationMutation";
import { OrdersPane } from "../components/OrdersPane";
import { OrderLinesPane } from "../components/OrderLinesPane";
import { LotAllocationPanel } from "../components/LotAllocationPanel";
import type { CandidateLotItem } from "../api";
import type { OrderLine } from "@/shared/types/aliases";

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

  // API: 引当確定mutation
  const commitMutation = useCommitAllocationMutation();

  // ロット候補リスト
  const candidateLots: CandidateLotItem[] = useMemo(
    () => candidatesQuery.data?.items ?? [],
    [candidatesQuery.data?.items],
  );

  // 選択中の受注明細
  const selectedOrderLine = useMemo<OrderLine | null>(() => {
    if (!selectedOrderLineId || !orderDetailQuery.data) return null;
    return (orderDetailQuery.data.lines?.find((line) => line.id === selectedOrderLineId) as OrderLine) || null;
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
        const maxQty = lot.free_qty ?? 0;
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
  const handleSelectOrder = useCallback(
    (orderId: number) => {
      setSelectedOrderId(orderId);

      // 明細が読み込まれたら先頭を自動選択
      // ここでは orderDetailQuery を使うため、useEffect で処理
    },
    [],
  );

  // 明細選択ハンドラー
  const handleSelectOrderLine = useCallback((lineId: number) => {
    setSelectedOrderLineId(lineId);
  }, []);

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
      const maxQty = targetLot ? (targetLot.free_qty ?? 0) : Number.POSITIVE_INFINITY;

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

  // 自動引当（FEFO）ハンドラー
  const handleAutoAllocate = useCallback(() => {
    if (!selectedOrderLine || candidateLots.length === 0) return;

    const orderQty = Number(selectedOrderLine.order_quantity ?? selectedOrderLine.quantity ?? 0);
    const allocatedQty = Number(selectedOrderLine.allocated_qty ?? 0);
    let remaining = orderQty - allocatedQty;

    const newAllocations: Record<number, number> = {};

    // FEFO順（既にバックエンドから賞味期限順でソート済みと仮定）
    for (const lot of candidateLots) {
      if (remaining <= 0) break;

      const lotId = lot.lot_id;
      const freeQty = lot.free_qty ?? 0;
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

  // 引当確定ハンドラー
  const handleCommitAllocation = useCallback(() => {
    if (!selectedOrderId) return;

    commitMutation.mutate(
      { order_id: selectedOrderId },
      {
        onSuccess: () => {
          setToast({ message: "引当を登録しました", variant: "success" });
          setLotAllocations({});
          setTimeout(() => setToast(null), 3000);
        },
        onError: (error) => {
          setToast({
            message: error.message || "引当の登録に失敗しました",
            variant: "error",
          });
          setTimeout(() => setToast(null), 5000);
        },
      },
    );
  }, [selectedOrderId, commitMutation]);

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
              renderInlineLots={false}
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
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onSaveAllocations={handleCommitAllocation}
              layout="sidePane"
              isLoading={candidatesQuery.isLoading}
              error={candidatesQuery.error}
              isSaving={commitMutation.isPending}
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
                isLoading={ordersQuery.isLoading}
                error={ordersQuery.error}
              />
            </div>
            <div className="h-1/2 overflow-hidden">
              <OrderLinesPane
                orderLines={orderDetailQuery.data?.lines ?? []}
                selectedOrderLineId={selectedOrderLineId}
                onSelectOrderLine={handleSelectOrderLine}
                renderInlineLots={false}
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
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onSaveAllocations={handleCommitAllocation}
              layout="sidePane"
              isLoading={candidatesQuery.isLoading}
              error={candidatesQuery.error}
              isSaving={commitMutation.isPending}
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
              isLoading={ordersQuery.isLoading}
              error={ordersQuery.error}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <OrderLinesPane
              orderLines={orderDetailQuery.data?.lines ?? []}
              selectedOrderLineId={selectedOrderLineId}
              onSelectOrderLine={handleSelectOrderLine}
              renderInlineLots={true}
              inlineLotContent={(line) => (
                <LotAllocationPanel
                  orderLine={line}
                  candidateLots={candidateLots}
                  lotAllocations={lotAllocations}
                  onLotAllocationChange={handleLotAllocationChange}
                  onAutoAllocate={handleAutoAllocate}
                  onClearAllocations={handleClearAllocations}
                  onSaveAllocations={handleCommitAllocation}
                  layout="inline"
                  isLoading={candidatesQuery.isLoading}
                  error={candidatesQuery.error}
                  isSaving={commitMutation.isPending}
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
