/**
 * Hook to check if a line is over-allocated
 *
 * 【設計意図】過剰引当チェックロジック:
 *
 * 1. なぜDB引当とUI引当を分けるのか
 *    理由: 引当には2つの状態が存在
 *    - dbAllocated: データベースに既に保存されている確定済み引当
 *    - uiAllocated: 画面上で編集中の未保存引当（draft状態）
 *    → 合計が受注数量を超えていないかをチェック
 *    例:
 *    - 受注数量: 100個
 *    - DB既存引当: 30個（既に保存済み）
 *    - UI新規引当: 80個（画面で編集中）
 *    → 合計110個 > 100個 → 過剰引当
 *
 * 2. requiredQty の取得
 *    理由: getOrderQuantity() は単位換算を考慮
 *    → 受注単位が「箱」でも、在庫単位が「個」の場合、換算した数量を返す
 *    → 正確な過剰引当判定のため、内部単位での受注数量を使用
 *
 * 3. line が見つからない場合、false を返す
 *    理由: エラーではなく、「過剰引当ではない」として扱う
 *    ケース:
 *    - データの不整合（削除された明細へのアクセス）
 *    - キャッシュの遅延（まだロードされていない）
 *    → false を返すことで、保存処理等が意図せず中断されない
 *    トレードオフ: バックエンドで最終的にバリデーション
 *
 * 4. useCallback によるメモ化
 *    理由: isOverAllocatedは保存ハンドラー内で呼ばれる
 *    → 依存配列が変わらない限り、関数を再生成しない
 *    → 保存ハンドラー自体もuseCallbackでメモ化されているため、連鎖的な再生成を防ぐ
 */

import { useCallback } from "react";

import type { AllocationsByLine } from "../types";
import {
  calculateTotalUiAllocated,
  checkOverAllocation,
  getAllocatedQuantity,
  getOrderQuantity,
} from "../utils/allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Hook to check if a line is over-allocated
 * @param params - Check parameters
 * @returns Function to check over-allocation status
 */
export function useIsOverAllocated({
  allLines,
  allocationsByLine,
}: {
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
}) {
  return useCallback(
    (lineId: number): boolean => {
      const line = allLines.find((l) => l.id === lineId);
      // 【設計】明細が見つからない場合は false（過剰引当ではないとみなす）
      if (!line) return false;

      const requiredQty = getOrderQuantity(line);
      const dbAllocated = getAllocatedQuantity(line);
      const uiAllocated = calculateTotalUiAllocated(allocationsByLine[lineId] ?? {});

      // 【設計】DB既存引当 + UI新規引当の合計が受注数量を超えているかチェック
      return checkOverAllocation({ requiredQty, dbAllocated, uiAllocated });
    },
    [allLines, allocationsByLine],
  );
}
