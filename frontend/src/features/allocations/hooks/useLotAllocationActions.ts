/**
 * Lot allocation action hooks
 * Main orchestration hook that combines all allocation-related functionality
 *
 * 【設計意図】なぜオーケストレーターフックが必要なのか:
 *
 * 1. 関心の分離（Separation of Concerns）
 *    理由: 各アクション（変更、自動引当、保存等）を独立したフックに分割
 *    メリット:
 *    - 各フックが単一責任を持つ（SRP: Single Responsibility Principle）
 *    - テストが容易（個別にテスト可能）
 *    - コードの可読性向上（各ファイルが短く、理解しやすい）
 *
 * 2. コンポジションパターン（Composition over Inheritance）
 *    理由: 複数の小さなフックを組み合わせて、複雑な機能を実現
 *    → 継承ではなく、合成（composition）でロジックを構築
 *    例:
 *    - useCandidateLotFetcher: キャッシュから候補ロット取得
 *    - useChangeAllocationHandler: 引当数量変更
 *    - useAutoAllocateHandler: 自動引当ロジック
 *    - useAllocationSaver: バックエンドへの保存
 *    → これらを組み合わせて、完全な引当管理機能を提供
 *
 * 3. 依存性注入（Dependency Injection）
 *    理由: 各フックに必要な依存を明示的に渡す
 *    例: candidateFetcher を useChangeAllocationHandler に渡す
 *    メリット:
 *    - 依存関係が明確（どのフックが何に依存しているかが分かる）
 *    - テスト時にモックを注入しやすい
 *
 * 4. 統合インターフェース
 *    理由: コンポーネント側は、このフック1つを使うだけで全機能にアクセス可能
 *    → 7つの小さなフックを個別にimportする必要がない
 *    → API が統一され、使いやすい
 */

import type { QueryClient } from "@tanstack/react-query";

import type { AllocationsByLine, AllocationToastState, LineStatusMap } from "../types";

import { useAllocationSaver } from "./useAllocationSaver";
import { useAutoAllocateHandler } from "./useAutoAllocateHandler";
import { useCandidateLotFetcher } from "./useCandidateLotFetcher";
import { useChangeAllocationHandler } from "./useChangeAllocationHandler";
import { useClearAllocationsHandler } from "./useClearAllocationsHandler";
import { useGetAllocationsForLine } from "./useGetAllocationsForLine";
import { useIsOverAllocated } from "./useIsOverAllocated";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Options for useLotAllocationActions hook
 */
interface UseLotAllocationActionsOptions {
  queryClient: QueryClient;
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
  setToast: React.Dispatch<React.SetStateAction<AllocationToastState>>;
}

/**
 * Main hook for lot allocation actions
 * Provides all actions needed for managing lot allocations
 *
 * @param options - Hook options
 * @returns Allocation action functions and state
 */
export function useLotAllocationActions(options: UseLotAllocationActionsOptions) {
  const candidateFetcher = useCandidateLotFetcher(options.queryClient);

  const getAllocationsForLine = useGetAllocationsForLine(options.allocationsByLine);

  const changeAllocation = useChangeAllocationHandler({
    allLines: options.allLines,
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const autoAllocate = useAutoAllocateHandler({
    allLines: options.allLines,
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const clearAllocations = useClearAllocationsHandler({
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const isOverAllocated = useIsOverAllocated({
    allLines: options.allLines,
    allocationsByLine: options.allocationsByLine,
  });

  const { saveAllocations, saveAllocationsMutation } = useAllocationSaver({
    ...options,
    isOverAllocated,
  });

  return {
    /**
     * Get candidate lots for a line from cache
     */
    getCandidateLots: candidateFetcher,

    /**
     * Get allocations for a specific line
     */
    getAllocationsForLine,

    /**
     * Change allocation quantity for a lot
     */
    changeAllocation,

    /**
     * Auto-allocate using FEFO strategy
     */
    autoAllocate,

    /**
     * Clear all allocations for a line
     */
    clearAllocations,

    /**
     * Save allocations to backend
     */
    saveAllocations,

    /**
     * Check if a line is over-allocated
     */
    isOverAllocated,

    /**
     * Mutation object for save allocations (for accessing loading state, etc.)
     */
    saveAllocationsMutation,
  };
}
