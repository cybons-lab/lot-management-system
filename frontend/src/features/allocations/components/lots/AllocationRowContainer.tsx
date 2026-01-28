import { useAllocationCandidates } from "../../hooks/api";
import { useAllocationContext } from "../../hooks/useAllocationContext";

import { LotAllocationPanel } from "./LotAllocationPanel";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

interface AllocationRowContainerProps {
  order: OrderWithLinesResponse;
  line: OrderLine;
  customerName?: string;
  productName?: string;
  deliveryPlaceName?: string;
}

/**
 * AllocationRowContainer - ロット引当行のコンテナ
 *
 * useAllocationContextを使用してハンドラーと状態をJotai atomから取得。
 * これにより、親コンポーネントからのProp Drillingが不要になる。
 */
export function AllocationRowContainer({
  order,
  line,
  customerName,
  productName,
  deliveryPlaceName,
}: AllocationRowContainerProps) {
  // Jotai atomからハンドラーと状態を取得
  const {
    getLineAllocations,
    isOverAllocated: checkIsOverAllocated,
    onLotAllocationChange,
    onAutoAllocate,
    onClearAllocations,
    onSaveAllocations,
    lineStatuses,
    activeLineId,
    setActiveLineId,
  } = useAllocationContext();

  const lineStatus = lineStatuses[line.id] ?? "clean";
  const isOverAllocated = checkIsOverAllocated(line.id);
  const isActive = activeLineId === line.id;
  const onActivate = () => setActiveLineId(line.id);
  const { data, isLoading, error } = useAllocationCandidates({
    order_line_id: line.id,
    product_group_id: Number(line.product_group_id || 0),
    strategy: "fefo",
    limit: 200,
  });

  // ユーザー要望: 期限切れロットは候補として表示しない
  const candidateLots = (data?.items ?? []).filter(
    (lot: { is_expired?: boolean; expiry_date?: string | null }) => {
      // is_expiredフラグがあればそれを使用、なければ日付比較
      if ("is_expired" in lot) return !lot.is_expired;
      // expiry_dateが文字列で来る場合を想定
      if (lot.expiry_date) {
        const expiry = new Date(lot.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry >= today;
      }
      return true;
    },
  );
  const currentAllocations = getLineAllocations(line.id);
  const canSave = lineStatus === "draft" && !isOverAllocated;

  // Calculate allocationState from backend reservations
  let allocationState: "none" | "soft" | "hard" | "mixed" = "none";
  const reservations = Array.isArray(line.reservations) ? line.reservations : [];
  if (reservations.length > 0) {
    const hasHard = reservations.some((a) => a.status === "confirmed");
    const hasSoft = reservations.some((a) => a.status === "active" || a.status === "temporary");
    if (hasHard && hasSoft) allocationState = "mixed";
    else if (hasHard) allocationState = "hard";
    else if (hasSoft) allocationState = "soft";
  }

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
      allocationState={allocationState}
    />
  );
}
