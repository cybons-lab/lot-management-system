import { Loader2 } from "lucide-react";

import { LotCandidateRow } from "./LotCandidateRow";

import { ALLOCATION_CONSTANTS } from "@/features/allocations/constants";
import { useAllocationCandidates } from "@/features/allocations/hooks/api/useAllocationCandidates";
import type { useLotAllocationForOrder } from "@/features/forecasts/hooks/useLotAllocationForOrder";
import { cn } from "@/shared/libs/utils";
import type { OrderLine } from "@/shared/types/aliases";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface OrderAllocationInlineProps {
  line: OrderLine;
  logic: ReturnType<typeof useLotAllocationForOrder>;
}

export function OrderAllocationInline({ line, logic }: OrderAllocationInlineProps) {
  const { getAllocationsForLine, changeAllocation, saveAllocations } = logic;

  // ロット候補の取得 (useAllocationCandidatesを直接使用)
  const { data: candidatesData, isLoading } = useAllocationCandidates({
    order_line_id: line.id,
    strategy: "fefo",
    limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
  });
  const candidates = candidatesData?.items || [];

  // 現在の引当状況 (Record<lotId, quantity>)
  const allocationsMap = getAllocationsForLine(line.id);

  // 計算
  const requiredQty = Number(line.order_quantity || 0);
  // オブジェクトの値の合計を計算
  const allocatedTotal = Object.values(allocationsMap).reduce((sum, qty) => sum + qty, 0);
  const remainingQty = Math.max(0, requiredQty - allocatedTotal);

  // 保存処理
  const handleSave = async () => {
    try {
      // 単一ロットの引当として保存
      await saveAllocations(line.id);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ロット候補を検索中...
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="py-2 text-center text-sm text-gray-500">
        引当可能なロット候補が見つかりません
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {/* ヘッダー情報 */}
      <div className="mb-2 flex items-center gap-4 text-sm font-medium text-gray-700">
        <div>
          必要: <span className="font-bold">{formatQuantity(requiredQty, line.unit || "PCS")}</span>
        </div>
        <div>/</div>
        <div className={cn(allocatedTotal > 0 ? "text-blue-600" : "")}>
          引当済:{" "}
          <span className="font-bold">{formatQuantity(allocatedTotal, line.unit || "PCS")}</span>
        </div>
        <div>/</div>
        <div className={cn(remainingQty > 0 ? "text-orange-600" : "text-green-600")}>
          残: <span className="font-bold">{formatQuantity(remainingQty, line.unit || "PCS")}</span>
        </div>
        <div className="ml-auto text-xs text-gray-500">単位: {line.unit || "PCS"}</div>
      </div>

      {/* ロット候補リスト */}
      <div className="space-y-1">
        {candidates.map((lot) => (
          <LotCandidateRow
            key={lot.lot_id}
            lot={lot}
            line={line}
            currentQty={allocationsMap[lot.lot_id] || 0}
            allocatedTotal={allocatedTotal}
            requiredQty={requiredQty}
            onChangeAllocation={changeAllocation}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}
