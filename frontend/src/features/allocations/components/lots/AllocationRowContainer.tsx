import { useAllocationCandidates } from "../../hooks/api";
import type { LineStatus } from "../../hooks/useLotAllocation";
import { LotAllocationPanel } from "./LotAllocationPanel";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

interface AllocationRowContainerProps {
  order: OrderWithLinesResponse;
  line: any; // OrderLine
  getLineAllocations: (lineId: number) => Record<number, number>;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;
  lineStatus: LineStatus;
  isOverAllocated: boolean;
  customerName?: string;
  productName?: string;
  deliveryPlaceName?: string;
  isActive: boolean;
  onActivate: () => void;
}

export function AllocationRowContainer({
  order,
  line,
  getLineAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  lineStatus,
  isOverAllocated,
  customerName,
  productName,
  deliveryPlaceName,
  isActive,
  onActivate,
}: AllocationRowContainerProps) {
  const { data, isLoading, error } = useAllocationCandidates({
    order_line_id: line.id,
    strategy: "fefo",
    limit: 200,
  });

  // ユーザー要望: 期限切れロットは候補として表示しない
  const candidateLots = (data?.items ?? []).filter(lot => {
    // is_expiredフラグがあればそれを使用、なければ日付比較
    if ('is_expired' in lot) return !lot.is_expired;
    // expiry_dateが文字列で来る場合を想定
    if (lot.expiry_date) {
      const expiry = new Date(lot.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiry >= today;
    }
    return true;
  });
  const currentAllocations = getLineAllocations(line.id);
  const canSave = lineStatus === "draft" && !isOverAllocated;

  return (
    <LotAllocationPanel
      order={order}
      orderLine={line}
      customerName={customerName}
      productName={productName}
      deliveryPlaceName={deliveryPlaceName}
      candidateLots={candidateLots}
      lotAllocations={currentAllocations}
      onLotAllocationChange={(lotId, qty) => onLotAllocationChange(line.id, lotId, qty)}
      onAutoAllocate={() => onAutoAllocate(line.id)}
      onClearAllocations={() => onClearAllocations(line.id)}
      onSaveAllocations={() => onSaveAllocations(line.id)}
      canSave={canSave}
      isOverAllocated={isOverAllocated}
      isLoading={isLoading}
      error={error as Error}
      isActive={isActive}
      onActivate={onActivate}
    />
  );
}
