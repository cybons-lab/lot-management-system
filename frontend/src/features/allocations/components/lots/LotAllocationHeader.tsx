import { LotAllocationHeaderView } from "./LotAllocationHeaderView";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate, formatDateTime } from "@/shared/utils/date";
import { formatOrderCode } from "@/shared/utils/order";

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

interface HeaderMetadata {
  orderNumber: string;
  productCode: string;
  productName: string;
  deliveryDate: string;
  orderQuantity: number;
  orderUnit: string;
  inventoryUnit: string;
  lockedBy: string | null;
  lockedAt: string | null;
  isComplete: boolean;
}

/**
 * 表示用のメタデータを取得する
 */
function getHeaderMetadata(
  order: OrderWithLinesResponse | undefined,
  orderLine: OrderLine,
  propProductName: string,
  remainingQty: number,
  isOverAllocated: boolean,
): HeaderMetadata {
  const orderNumber = formatOrderCode(order) || "不明な受注";
  const productCode = orderLine.product_code || "CODE";
  const productName = propProductName || orderLine.product_name || "品名不明";
  const deliveryDate = formatDate(orderLine.delivery_date || orderLine.due_date, {
    fallback: "未設定",
  });
  const orderQuantity = Number(orderLine.order_quantity ?? orderLine.quantity ?? 0);
  const orderUnit = orderLine.unit || orderLine.product_external_unit || "";
  const inventoryUnit = orderLine.product_internal_unit || orderUnit;
  const lockedBy = order?.locked_by_user_name ?? order?.locked_by ?? null;
  const lockedAt = order?.locked_at ? formatDateTime(order.locked_at) : null;
  const isComplete = remainingQty === 0 && !isOverAllocated;

  return {
    orderNumber,
    productCode,
    productName,
    deliveryDate,
    orderQuantity,
    orderUnit,
    inventoryUnit,
    lockedBy,
    lockedAt,
    isComplete,
  };
}

export function LotAllocationHeader({
  order,
  orderLine,
  customerName,
  productName: propProductName,
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
  const meta = getHeaderMetadata(order, orderLine, propProductName, remainingQty, isOverAllocated);

  return (
    <LotAllocationHeaderView
      orderNumber={meta.orderNumber}
      customerName={customerName}
      deliveryPlaceName={deliveryPlaceName}
      deliveryDate={meta.deliveryDate}
      productCode={meta.productCode}
      productName={meta.productName}
      orderUnit={meta.orderUnit}
      inventoryUnit={meta.inventoryUnit}
      orderQuantity={meta.orderQuantity}
      requiredQty={requiredQty}
      totalAllocated={totalAllocated}
      hardAllocated={hardAllocated}
      softAllocated={softAllocated}
      remainingQty={remainingQty}
      progressPercent={progressPercent}
      isOverAllocated={isOverAllocated}
      isComplete={meta.isComplete}
      justSaved={false}
      isLoading={isLoading}
      hasCandidates={hasCandidates ?? false}
      supplierName={orderLine.supplier_name || undefined}
      lockedBy={meta.lockedBy || undefined}
      lockedAt={meta.lockedAt || undefined}
      allocationCount={allocationCount}
      hasExpiryWarning={hasExpiryWarning}
      hasExpiredError={hasExpiredError}
      lineStatus={lineStatus}
    />
  );
}
