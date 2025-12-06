import { LotAllocationHeaderView } from "./LotAllocationHeaderView";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate, formatDateTime } from "@/shared/utils/date";

interface LotAllocationHeaderProps {
  order?: OrderWithLinesResponse;
  orderLine: OrderLine;
  customerName: string;
  productName: string;
  deliveryPlaceName: string;
  requiredQty: number;
  totalAllocated: number;
  hardAllocated?: number;
  softAllocated?: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
  allocationCount: number;
  hasExpiryWarning: boolean;
  hasExpiredError: boolean;
  lineStatus?: string | null;
}

export function LotAllocationHeader({
  order,
  orderLine,
  customerName,
  productName: propProductName, // Keep propProductName for internal renaming
  deliveryPlaceName,
  requiredQty,
  totalAllocated,
  hardAllocated,
  softAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  isLoading,
  hasCandidates,
  allocationCount,
  hasExpiryWarning,
  hasExpiredError,
  lineStatus,
}: LotAllocationHeaderProps) {
  const orderNumber = order?.order_number || "不明な受注";
  const productCode = orderLine.product_code || "CODE";
  const productName = propProductName || orderLine.product_name || "品名不明"; // Use propProductName here
  const deliveryDate = formatDate(orderLine.delivery_date || orderLine.due_date, {
    fallback: "未設定",
  });
  const orderQuantity = Number(orderLine.order_quantity ?? orderLine.quantity ?? 0);
  const orderUnit = orderLine.unit || orderLine.product_external_unit || "";
  const inventoryUnit = orderLine.product_internal_unit || orderUnit;
  const lockedBy = order?.locked_by_user_name ?? order?.locked_by ?? null;
  const lockedAt = order?.locked_at ? formatDateTime(order.locked_at) : null;

  // Removed justSaved state and useEffect as isSaving is no longer a prop

  const isComplete = remainingQty === 0 && !isOverAllocated;

  return (
    <LotAllocationHeaderView
      orderNumber={orderNumber}
      customerName={customerName}
      deliveryPlaceName={deliveryPlaceName}
      deliveryDate={deliveryDate}
      productCode={productCode}
      productName={productName}
      orderUnit={orderUnit}
      inventoryUnit={inventoryUnit}
      orderQuantity={orderQuantity}
      requiredQty={requiredQty}
      totalAllocated={totalAllocated}
      hardAllocated={hardAllocated}
      softAllocated={softAllocated}
      remainingQty={remainingQty}
      progressPercent={progressPercent}
      isOverAllocated={isOverAllocated}
      isComplete={isComplete}
      justSaved={false} // Set to false as per instruction example
      isLoading={isLoading}
      hasCandidates={hasCandidates ?? false}
      // Removed onAutoAllocate, onClearAllocations, onSaveAllocations, onConfirmHard, canSave
      supplierName={orderLine.supplier_name || undefined}
      lockedBy={lockedBy || undefined}
      lockedAt={lockedAt || undefined}
      allocationCount={allocationCount}
      hasExpiryWarning={hasExpiryWarning}
      hasExpiredError={hasExpiredError}
      lineStatus={lineStatus}
    />
  );
}
