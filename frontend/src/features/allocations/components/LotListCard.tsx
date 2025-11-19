import { memo } from "react";
import type { CandidateLotItem } from "../api";
import { AllocationInput } from "./AllocationInput";
import { LotInfo } from "./LotInfo";
import { LotActions } from "./LotActions";

interface LotListCardProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  onAllocationChange: (quantity: number) => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
}

export const LotListCard = memo(function LotListCard({
  lot,
  allocatedQty,
  onAllocationChange,
  onSave,
  canSave,
  isSaving,
}: LotListCardProps) {
  const availableQty = Number(lot.free_qty ?? lot.current_quantity ?? lot.available_qty ?? 0);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
      {/* Upper: Info Section */}
      <LotInfo lot={lot} />

      {/* Lower: Controls Section (Border Topで区切りを入れる) */}
      <div className="mt-2 flex items-end justify-between gap-2 border-t pt-3">
        {/* Left Group: Stock Label + Input */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-baseline gap-1 text-xs text-gray-500">
            <span>在庫:</span>
            <span className="font-mono font-semibold text-blue-600">
              {availableQty.toLocaleString()}
            </span>
          </div>
          <AllocationInput
            value={allocatedQty}
            max={availableQty}
            onChange={onAllocationChange}
            disabled={isSaving}
          />
        </div>

        {/* Right Group: Actions */}
        <LotActions
          onFill={() => onAllocationChange(availableQty)}
          onSave={onSave}
          canSave={canSave}
          isSaving={isSaving}
          hasInput={allocatedQty > 0}
        />
      </div>
    </div>
  );
});
