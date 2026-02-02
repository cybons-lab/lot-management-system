/**
 * Hook to handle allocation quantity changes
 *
 * 【設計意図】引当数量変更処理の設計判断:
 *
 * 1. clampAllocationQuantity による値の制限
 *    理由: ユーザー入力を安全な範囲に制限
 *    制限内容:
 *    - 最小値: 0（負の数は許容しない）
 *    - 最大値: ロットの利用可能数量（在庫を超えて引当できない）
 *    例:
 *    - ユーザーが「-10」を入力 → 0 にクランプ
 *    - ロットの在庫が50個、ユーザーが「100」を入力 → 50 にクランプ
 *
 * 2. maxAllowed のデフォルトが Infinity
 *    理由: 候補ロット一覧にロットが見つからない場合の安全策
 *    ケース:
 *    - キャッシュがまだロードされていない
 *    - データの不整合（ロットがDB削除された等）
 *    → Infinity にすることで、エラーを起こさずユーザー入力を許容
 *    トレードオフ: バックエンドで最終的にバリデーション
 *
 * 3. 値が0の場合、オブジェクトから削除（L50-52）
 *    理由: 引当数量0 = 「引当なし」と同義
 *    実装:
 *    - const { [lotId]: _, ...rest } でlotIdキーを除外
 *    → 不要なキーをオブジェクトに残さない（データのクリーン性）
 *    メリット:
 *    - 保存時のペイロードが軽量（0件の引当は送信不要）
 *    - 画面表示がシンプル（0件の行は非表示）
 *
 * 4. setLineStatusToDraft の呼び出し
 *    理由: ユーザーが引当数量を変更した瞬間、「未保存」状態にする
 *    → ステータスを "draft" に変更
 *    → ユーザーは「保存が必要」であることを視覚的に認識
 *    → 画面を離れる前に保存を促すUI（未実装の場合は将来対応）
 *
 * 5. useCallback によるメモ化
 *    理由: 依存配列が変わらない限り、関数を再生成しない
 *    → この関数はコンポーネントに渡され、useEffectの依存配列に含まれる可能性
 *    → 再生成を防ぐことで、無限ループを回避
 */

import { useCallback } from "react";

import { setLineStatusToDraft } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, CandidateLotFetcher, LineStatusMap } from "../types";
import { clampAllocationQuantity, getFreeQuantity } from "../utils/allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Hook to handle allocation quantity changes
 * @param params - Handler parameters
 * @returns Change allocation handler function
 */
export function useChangeAllocationHandler({
  allLines,
  candidateFetcher,
  setAllocationsByLine,
  setLineStatuses,
}: {
  allLines: OrderLine[];
  candidateFetcher: CandidateLotFetcher;
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
}) {
  return useCallback(
    (lineId: number, lotId: number, value: number) => {
      // Find the line to get product_group_id
      const line = allLines.find((l) => l.id === lineId);
      const productId = Number(line?.product_group_id || 0);

      // Fetch candidate lots to determine max allowed quantity
      // 【設計】キャッシュから候補ロットを取得し、利用可能数量を確認
      const candidates = candidateFetcher(lineId, productId);
      const targetLot = candidates.find((lot) => lot.lot_id === lotId);

      // Determine max allowed quantity (default to Infinity if lot not found)
      // 【設計】見つからない場合はInfinity → バックエンドで最終チェック
      const maxAllowed = targetLot ? getFreeQuantity(targetLot) : Infinity;

      // Clamp value to valid range
      const clampedValue = clampAllocationQuantity({ value, maxAllowed });

      // Update allocations state
      setAllocationsByLine((prev) => {
        const lineAllocations = prev[lineId] ?? {};

        // If clamped value is 0, remove the lot from allocations
        // 【設計】0の場合はキーを削除し、オブジェクトをクリーンに保つ
        if (clampedValue === 0) {
          const { [lotId]: _, ...rest } = lineAllocations;
          return { ...prev, [lineId]: rest };
        }

        // Otherwise, update the allocation
        return {
          ...prev,
          [lineId]: { ...lineAllocations, [lotId]: clampedValue },
        };
      });

      // Mark line as draft (has unsaved changes)
      // 【設計】変更後は即座にdraftステータスに → ユーザーに「未保存」を明示
      setLineStatusToDraft(lineId, setLineStatuses);
    },
    [allLines, candidateFetcher, setAllocationsByLine, setLineStatuses],
  );
}
