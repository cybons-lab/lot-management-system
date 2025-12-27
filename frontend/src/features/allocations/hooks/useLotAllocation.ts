/**
 * Main orchestrator hook for lot allocation page
 *
 * 【設計意図】なぜこのフックが必要なのか:
 *
 * 1. ロジックとアクションの統合
 *    理由: useLotAllocationLogicとuseLotAllocationActionsを組み合わせる
 *    → useLotAllocationLogic: 状態管理とデータフェッチング
 *    → useLotAllocationActions: ユーザーアクション（保存、自動引当等）
 *    → このフックで統合し、1つのインターフェースをコンポーネントに提供
 *
 * 2. 自動引当の制御（現在はコメントアウト）
 *    背景: 初期実装では画面表示時に全明細を自動引当する予定だった
 *    問題: 「values buried」issue - DBに保存済みの引当が画面に表示されない
 *    → 自動引当を実行すると、既存の引当を上書きしてしまう可能性
 *    対応: 自動引当ループを無効化（L73-90）
 *    → ユーザーが明示的に「自動引当」ボタンを押した時のみ実行
 *
 * 3. useRefによる二重実行防止
 *    理由: React Strict Modeでは、useEffectが2回実行される
 *    → hasAutoAllocatedRef.currentで、既に実行済みかを判定
 *    → 自動引当が複数回実行されることを防ぐ
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { LineStatus, LineStockStatus } from "../types";

import { useLotAllocationActions } from "./useLotAllocationActions";
import { useLotAllocationLogic } from "./useLotAllocationLogic";

export type { LineStatus, LineStockStatus };

export function useLotAllocation() {
  const queryClient = useQueryClient();

  const {
    allocationsByLine,
    setAllocationsByLine,
    lineStatuses,
    setLineStatuses,
    toast,
    setToast,
    ordersQuery,
    orders,
    allLines,
    isCandidatesLoading,
    customerMap,
    productMap,
  } = useLotAllocationLogic();

  const {
    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,
    saveAllocationsMutation,
  } = useLotAllocationActions({
    queryClient,
    allLines,
    allocationsByLine,
    setAllocationsByLine,
    setLineStatuses,
    setToast,
  });

  // Auto-allocate on mount (once orders are loaded and candidates are ready)
  const hasAutoAllocatedRef = useRef(false);

  useEffect(() => {
    if (
      ordersQuery.isLoading ||
      isCandidatesLoading ||
      !allLines.length ||
      hasAutoAllocatedRef.current
    ) {
      return;
    }

    // Trigger auto-allocate for all lines that don't have allocations yet
    // We use a timeout to ensure candidate lots are fetched/available (or let the action handle it)
    // Note: autoAllocate relies on candidateFetcher which uses queryClient.getQueryData.
    // If data isn't in cache, it returns empty.
    // We might need to wait for candidates?
    // Actually, useLotAllocationData prefetches candidates!
    // But prefetching might take time.

    // For now, let's try running it. If candidates aren't ready, it might fail to allocate.
    // A better approach might be to let the user click "Auto Allocate All" or similar,
    // but the user asked for "values buried".

    // Let's try to run it.
    // ★以下の自動引当ループをコメントアウトして無効化★
    /*
        allLines.forEach((line) => {
          // Check if already allocated (in DB or UI)
          // If DB has allocations, we might not want to overwrite?
          // But the user wants "Soft Allocation" (Draft) to be applied.
          // If DB has "hard" allocations, they are loaded as "allocated_quantity" in the line?
          // No, OrderLine has `allocations` relationship?
          // If so, we should load them.
    
          // Assuming we want to fill *unallocated* portion.
          // autoAllocate logic checks `dbAllocated` and fills the rest.
    
          if (!allocationsByLine[line.id]) {
            autoAllocate(line.id);
          }
        });
        */

    hasAutoAllocatedRef.current = true;
  }, [ordersQuery.isLoading, isCandidatesLoading, allLines, autoAllocate, allocationsByLine]);

  return {
    orders,
    customerMap,
    productMap,
    allocationsByLine,
    lineStatuses,
    toast,

    isLoadingOrders: ordersQuery.isLoading,
    isCandidatesLoading,
    isSavingAllocations: saveAllocationsMutation.isPending,

    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,

    selectedOrderId: null,
    selectedOrderLineId: null,
  };
}
