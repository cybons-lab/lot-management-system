import { LotActionSection } from "./LotActionSection";
import { LotInfoSection } from "./LotInfoSection";
import { useLotCandidateRow } from "./useLotCandidateRow";

import { type CandidateLotItem } from "@/features/allocations/api";
import { cn } from "@/shared/libs/utils";
import { type OrderLine } from "@/shared/types/aliases";

interface LotCandidateRowProps {
  lot: CandidateLotItem;
  line: OrderLine;
  currentQty: number;
  allocatedTotal: number;
  requiredQty: number;
  onChangeAllocation: (lineId: number, lotId: number, value: number) => void;
  onSave: () => void;
}

export function LotCandidateRow({
  lot,
  line,
  currentQty,
  allocatedTotal,
  requiredQty,
  onChangeAllocation,
  onSave,
}: LotCandidateRowProps) {
  const {
    isShaking,
    isConfirmed,
    freeQty,
    remainingInLot,
    isExpired,
    isLocked,
    limit,
    handleInputChange,
    handleFull,
    handleConfirm,
    handleClear,
  } = useLotCandidateRow({
    lot,
    line,
    currentQty,
    allocatedTotal,
    requiredQty,
    onChangeAllocation,
    onSave,
  });

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-x-4 rounded border bg-white px-4 py-2 text-sm shadow-sm",
        isExpired ? "border-red-200 bg-red-50" : "border-slate-100",
        isLocked && "bg-gray-100",
        freeQty <= 0 && "opacity-50",
      )}
    >
      <LotInfoSection
        lot={lot}
        line={line}
        currentQty={currentQty}
        isLocked={isLocked}
        isExpired={isExpired}
      />

      <LotActionSection
        currentQty={currentQty}
        remainingInLot={remainingInLot}
        freeQty={freeQty}
        line={line}
        limit={limit}
        isConfirmed={isConfirmed}
        isShaking={isShaking}
        isLocked={isLocked}
        onInputChange={handleInputChange}
        onFull={handleFull}
        onConfirm={handleConfirm}
        onClear={handleClear}
      />
    </div>
  );
}
