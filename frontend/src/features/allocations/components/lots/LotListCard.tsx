/**
 * LotListCard - Refactored
 * Card component for displaying lot allocation options.
 *
 * customerId, deliveryPlaceId, productIdはcurrentLineContextAtomから取得されるため、
 * propsでの受け渡しが不要になった（Phase 2）
 */
import type { CandidateLotItem } from "../../api";

import { AllocationInputSection } from "./AllocationInputSection";
import { useLotCardActions } from "./hooks/useLotCardActions";
import { LotInfoSection } from "./LotInfoSection";

import { cn } from "@/shared/libs/utils";

interface LotListCardProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  maxAllocatable: number;
  requiredQty: number;
  rank: number;
  onAllocationChange: (qty: number) => void;
  onFullAllocation: (qty: number) => void;
}

export function LotListCard({
  lot,
  allocatedQty,
  maxAllocatable,
  requiredQty,
  rank,
  onAllocationChange,
  onFullAllocation,
}: LotListCardProps) {
  const freeQty = Number(lot.available_quantity ?? 0);
  const remainingInLot = Math.max(0, freeQty - allocatedQty);
  const isExpired = lot.expiry_date ? new Date(lot.expiry_date) < new Date() : false;
  const limit = Math.min(freeQty, maxAllocatable);
  const isLocked = lot.status === "locked" || lot.status === "quarantine";

  const {
    isShaking,
    isConfirmed,
    handleInputChange,
    handleFullAllocation,
    handleConfirm,
    handleClearAllocation,
  } = useLotCardActions({
    allocatedQty,
    freeQty,
    limit,
    requiredQty,
    onAllocationChange,
    onFullAllocation,
  });

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-x-4 px-4 py-2 text-sm",
        isLocked ? "bg-gray-100" : "bg-white",
        freeQty <= 0 && "opacity-50",
      )}
    >
      <LotInfoSection
        lot={lot}
        rank={rank}
        allocatedQty={allocatedQty}
        isExpired={isExpired}
        freeQty={freeQty}
      />

      <AllocationInputSection
        lot={lot}
        allocatedQty={allocatedQty}
        freeQty={freeQty}
        remainingInLot={remainingInLot}
        limit={limit}
        isShaking={isShaking}
        isConfirmed={isConfirmed}
        handleInputChange={handleInputChange}
        handleFullAllocation={handleFullAllocation}
        handleConfirm={handleConfirm}
        handleClearAllocation={handleClearAllocation}
      />
    </div>
  );
}
