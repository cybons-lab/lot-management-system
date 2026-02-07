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
  hardAllocated?: number;
  softAllocated?: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  isComplete: boolean;
  justSaved: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
  supplierName?: string;
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
  orderQuantity,
  totalAllocated,
  hardAllocated,
  softAllocated,
  remainingQty,
  isOverAllocated,
  isComplete,
  justSaved,
  hasCandidates,
  supplierName,
  lockedBy,
  lockedAt,
  allocationCount = 0,
  hasExpiryWarning = false,
  hasExpiredError = false,
  lineStatus,
}: LotAllocationHeaderViewProps) {
  const { status, colorClass } = useAllocationStatus({
    isOverAllocated,
    isComplete,
    totalAllocated,
    remainingQty,
    justSaved,
    // canSave removed to avoid duplicate
    canSave: false, // canSave is removed, so setting a default or removing if not needed by useAllocationStatus
    ...(lineStatus !== undefined ? { lineStatus } : {}),
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
            {...(supplierName ? { supplierName } : { supplierName: "" })}
            deliveryPlaceName={deliveryPlaceName}
            deliveryDate={deliveryDate}
          />

          <div className="col-span-5">
            <QuantityProgressSection
              required={orderQuantity}
              allocated={totalAllocated}
              hardAllocated={hardAllocated ?? 0}
              softAllocated={softAllocated ?? 0}
              unit={orderUnit}
            />
          </div>

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
