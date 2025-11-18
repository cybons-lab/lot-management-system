/**
 * LotAllocationPageNew.tsx
 *
 * ロット引当ページ（v2.2対応・ゼロベース再実装版）
 *
 * 構成:
 * - 左ペイン: 受注一覧 + 受注明細一覧
 * - 右ペイン: ロット候補一覧 + 引当入力
 *
 * 状態管理:
 * - Jotai atoms: selectedOrderId, selectedLineId（グローバル選択状態）
 * - useState: lotAllocations（ページ内ローカル引当入力）
 *
 * APIフロー:
 * 1. 受注一覧取得: GET /api/orders
 * 2. 受注詳細取得: GET /api/orders/{order_id}
 * 3. ロット候補取得: GET /api/allocation-candidates?order_line_id=...
 * 4. 引当確定: POST /api/allocations/commit
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAtom } from "jotai";
import { selectedOrderIdAtom, selectedLineIdAtom } from "../store/atoms";
import { useOrdersForAllocation } from "../hooks/useOrdersForAllocation";
import { useOrderDetailForAllocation } from "../hooks/useOrderDetailForAllocation";
import { useAllocationCandidates } from "../hooks/useAllocationCandidates";
import { useCommitAllocationMutation } from "../hooks/useCommitAllocationMutation";
import { OrderAndLineListPane } from "../components/OrderAndLineListPane";
import { LotCandidatesAndAllocationPane } from "../components/LotCandidatesAndAllocationPane";
import type { CandidateLotItem } from "../api";

export function LotAllocationPage() {
  // グローバル選択状態（Jotai）
  const [selectedOrderId] = useAtom(selectedOrderIdAtom);
  const [selectedLineId] = useAtom(selectedLineIdAtom);

  // ローカル引当入力状態
  const [lotAllocations, setLotAllocations] = useState<Record<number, number>>({});

  // トースト通知状態
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );

  // API: 受注一覧取得
  const ordersQuery = useOrdersForAllocation();

  // API: 受注詳細取得
  const orderDetailQuery = useOrderDetailForAllocation(selectedOrderId);

  // API: ロット候補取得
  const candidatesQuery = useAllocationCandidates({
    order_line_id: selectedLineId ?? 0,
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
  const selectedLine = useMemo(() => {
    if (!selectedLineId || !orderDetailQuery.data) return undefined;
    return orderDetailQuery.data.lines?.find((line) => line.id === selectedLineId);
  }, [selectedLineId, orderDetailQuery.data]);

  // 明細が変わったら引当入力をリセット
  useEffect(() => {
    setLotAllocations({});
  }, [selectedLineId]);

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
    if (!selectedLine || candidateLots.length === 0) return;

    const orderQty = parseFloat(String(selectedLine.order_quantity ?? 0));
    let remaining = orderQty;

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
  }, [selectedLine, candidateLots]);

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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左ペイン: 受注一覧 + 受注明細一覧 */}
      <OrderAndLineListPane
        orders={ordersQuery.data ?? []}
        isLoading={ordersQuery.isLoading}
        selectedOrderDetail={orderDetailQuery.data}
      />

      {/* 右ペイン: ロット候補 + 引当入力 */}
      <LotCandidatesAndAllocationPane
        selectedLine={selectedLine}
        candidateLots={candidateLots}
        isLoadingCandidates={candidatesQuery.isLoading}
        candidatesError={candidatesQuery.error}
        lotAllocations={lotAllocations}
        onLotAllocationChange={handleLotAllocationChange}
        onAutoAllocate={handleAutoAllocate}
        onClearAllocations={handleClearAllocations}
        onCommitAllocation={handleCommitAllocation}
        isCommitting={commitMutation.isPending}
      />

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
