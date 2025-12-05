/**
 * LotAllocationHeaderView - Refactored
 * Header component for lot allocation page.
 */
import { AllocationStatusBadge, useAllocationStatus } from "./AllocationStatusBadge";
import { OrderContextSection } from "./OrderContextSection";
import { QuantityProgressSection } from "./QuantityProgressSection";
import { StatusSection } from "./StatusSection";

interface LotAllocationHeaderViewProps {
  orderNumber: string;
  customerName: string;
  deliveryPlaceName: string;
  deliveryDate: string;
  productCode: string;
  productName: string;
  orderUnit: string;
  inventoryUnit: string;
  orderQuantity: number;
  requiredQty: number;
  totalAllocated: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  isComplete: boolean;
  justSaved: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
  supplierName?: string;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  onConfirmHard?: () => void;
  canSave: boolean;
  lockedBy?: string;
  lockedAt?: string;
  allocationCount?: number;
  hasExpiryWarning?: boolean;
  hasExpiredError?: boolean;
  lineStatus?: string | null;
}

export function LotAllocationHeaderView({
  deliveryPlaceName,
  deliveryDate,
  productCode,
  productName,
  orderUnit,
  inventoryUnit,
  orderQuantity,
  requiredQty,
  totalAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  isComplete,
  justSaved,
  isSaving,
  isLoading,
  hasCandidates,
  supplierName,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  onConfirmHard,
  canSave,
  lockedBy,
  lockedAt,
  allocationCount = 0,
  hasExpiryWarning = false,
  hasExpiredError = false,
  lineStatus,
}: LotAllocationHeaderViewProps) {
  const isPartial = totalAllocated > 0 && remainingQty > 0;

  const { status, colorClass } = useAllocationStatus({
    isOverAllocated,
    isComplete,
    totalAllocated,
    remainingQty,
    justSaved,
    canSave,
    lineStatus,
  });

  return (
    <div className="flex flex-col bg-white transition-colors duration-300">
      {/* Lock Indicator */}
      {lockedBy && (
        <div className="flex items-center justify-center border-b border-yellow-100 bg-yellow-50 px-4 py-1 text-xs font-medium text-yellow-800">
          <span className="i-lucide-lock mr-1 h-3 w-3" />
          {lockedBy}さんが編集中 {lockedAt && `(${lockedAt})`}
        </div>
      )}

      <div className="flex flex-col gap-4 p-6">
        {/* Product Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-600">
            <span className="i-lucide-barcode h-3.5 w-3.5" />
            {productCode}
          </div>
          <div className="flex items-center gap-2">
            <span className="i-lucide-package h-5 w-5 text-gray-400" />
            <h2 className="text-xl leading-tight font-bold text-gray-900">{productName}</h2>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          <OrderContextSection
            supplierName={supplierName}
            deliveryPlaceName={deliveryPlaceName}
            deliveryDate={deliveryDate}
          />

          <QuantityProgressSection
            orderQuantity={orderQuantity}
            orderUnit={orderUnit}
            inventoryUnit={inventoryUnit}
            requiredQty={requiredQty}
            totalAllocated={totalAllocated}
            remainingQty={remainingQty}
            progressPercent={progressPercent}
            isOverAllocated={isOverAllocated}
            isComplete={isComplete}
            isPartial={isPartial}
            isLoading={isLoading}
            isSaving={isSaving}
            justSaved={justSaved}
            hasCandidates={hasCandidates}
            canSave={canSave}
            onAutoAllocate={onAutoAllocate}
            onClearAllocations={onClearAllocations}
            onSaveAllocations={onSaveAllocations}
            onConfirmHard={onConfirmHard}
          />

          <StatusSection
            statusBadge={<AllocationStatusBadge status={status} colorClass={colorClass} />}
            allocationCount={allocationCount}
            hasExpiryWarning={hasExpiryWarning}
            hasExpiredError={hasExpiredError}
            hasCandidates={hasCandidates}
          />
        </div>
      </div>
    </div>
  );
}
