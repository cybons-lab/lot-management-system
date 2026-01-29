import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LotCandidateRow } from "./LotCandidateRow";

import { type CandidateLotItem } from "@/features/allocations/api";
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

interface AllocationStatusHeaderProps {
  requiredQty: number;
  allocatedTotal: number;
  remainingQty: number;
  unit: string;
}

function AllocationStatusHeader({
  requiredQty,
  allocatedTotal,
  remainingQty,
  unit,
}: AllocationStatusHeaderProps) {
  return (
    <div className="mb-2 flex items-center gap-4 text-sm font-medium text-gray-700">
      <div>
        必要: <span className="font-bold">{formatQuantity(requiredQty, unit)}</span>
      </div>
      <div>/</div>
      <div className={cn(allocatedTotal > 0 ? "text-blue-600" : "")}>
        引当済: <span className="font-bold">{formatQuantity(allocatedTotal, unit)}</span>
      </div>
      <div>/</div>
      <div className={cn(remainingQty > 0 ? "text-orange-600" : "text-green-600")}>
        残: <span className="font-bold">{formatQuantity(remainingQty, unit)}</span>
      </div>
      <div className="ml-auto text-xs text-gray-500">単位: {unit}</div>
    </div>
  );
}

interface CandidateLotListProps {
  candidates: CandidateLotItem[];
  line: OrderLine;
  allocationsMap: Record<number, number>;
  allocatedTotal: number;
  requiredQty: number;
  onChangeAllocation: (lineId: number, lotId: number, value: number) => void;
  onSave: () => Promise<void>;
}

function CandidateLotList({
  candidates,
  line,
  allocationsMap,
  allocatedTotal,
  requiredQty,
  onChangeAllocation,
  onSave,
}: CandidateLotListProps) {
  return (
    <div className="space-y-1">
      {candidates.map((lot) => (
        <LotCandidateRow
          key={lot.lot_id}
          lot={lot}
          line={line}
          currentQty={allocationsMap[lot.lot_id] || 0}
          allocatedTotal={allocatedTotal}
          requiredQty={requiredQty}
          onChangeAllocation={onChangeAllocation}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

export function OrderAllocationInline({ line, logic }: OrderAllocationInlineProps) {
  const { getAllocationsForLine, changeAllocation, saveAllocations } = logic;

  // ロット候補の取得 (useAllocationCandidatesを直接使用)
  const { data: candidatesData, isLoading } = useAllocationCandidates({
    order_line_id: line.id,
    product_group_id: Number(line.product_group_id || 0),
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
      console.error("引当保存エラー:", error);
      toast.error("引当の保存に失敗しました");
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
      <AllocationStatusHeader
        requiredQty={requiredQty}
        allocatedTotal={allocatedTotal}
        remainingQty={remainingQty}
        unit={line.unit || "PCS"}
      />

      {/* ロット候補リスト */}
      <CandidateLotList
        candidates={candidates}
        line={line}
        allocationsMap={allocationsMap}
        allocatedTotal={allocatedTotal}
        requiredQty={requiredQty}
        onChangeAllocation={changeAllocation}
        onSave={handleSave}
      />
    </div>
  );
}
