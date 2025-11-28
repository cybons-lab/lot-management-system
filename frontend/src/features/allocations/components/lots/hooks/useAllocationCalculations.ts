import {
  calculateTotalUiAllocated,
  getAllocatedQuantity,
  getOrderQuantity,
} from "../../../utils/allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

interface UseAllocationCalculationsParams {
  orderLine: OrderLine | null;
  lotAllocations: Record<number, number>;
  remainingQtyOverride?: number;
}

interface AllocationCalculations {
  requiredQty: number;
  dbAllocated: number;
  uiAllocatedTotal: number;
  totalAllocated: number;
  remainingNeeded: number;
  displayRemaining: number;
  progressPercent: number;
  isComplete: boolean;
  isOver: boolean;
}

/**
 * 引当計算ロジックを集約するカスタムフック
 * レガシーフィールド対応を内部に隠蔽
 */
export function useAllocationCalculations({
  orderLine,
  lotAllocations,
  remainingQtyOverride,
}: UseAllocationCalculationsParams): AllocationCalculations {
  const requiredQty = orderLine ? getOrderQuantity(orderLine) : 0;

  // レガシーフィールド対応: allocated_qty または allocated_quantity
  const dbAllocated = orderLine ? getAllocatedQuantity(orderLine) : 0;

  // UI上で新規に引き当てた数量の合計
  const uiAllocatedTotal = calculateTotalUiAllocated(lotAllocations);

  // DB既存 + UI新規の合計
  const totalAllocated = dbAllocated + uiAllocatedTotal;

  // まだ引き当てが必要な数量
  const remainingNeeded = Math.max(0, requiredQty - totalAllocated);

  // 表示用の残数（親からのオーバーライドがあればそちらを優先）
  const displayRemaining =
    remainingQtyOverride !== undefined ? remainingQtyOverride : requiredQty - totalAllocated;

  // 進捗率（0〜100%）
  const progressPercent = requiredQty > 0 ? Math.min(100, (totalAllocated / requiredQty) * 100) : 0;

  // 完了状態: 残数0かつ過剰でない
  const isComplete = displayRemaining === 0;

  // 過剰状態: 残数がマイナス
  const isOver = displayRemaining < 0;

  return {
    requiredQty,
    dbAllocated,
    uiAllocatedTotal,
    totalAllocated,
    remainingNeeded,
    displayRemaining,
    progressPercent,
    isComplete,
    isOver,
  };
}
