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

const getOrderInfo = (order?: OrderWithLinesResponse) => ({
  orderNumber: formatOrderCode(order) || "不明な受注",
  lockedBy: order?.locked_by_user_name ?? order?.locked_by ?? null,
  lockedAt: order?.locked_at ? formatDateTime(order.locked_at) : null,
});

const getProductInfo = (line: OrderLine, propName: string) => ({
  productCode: line.product_code || "CODE",
  productName: propName || line.product_name || "品名不明",
  unitInfo: {
    orderUnit: line.unit || line.product_external_unit || "",
    inventoryUnit: line.product_internal_unit || line.unit || line.product_external_unit || "",
  },
});

/**
 * 表示用のメタデータを取得する
 */
function getHeaderMetadata(params: {
  order: OrderWithLinesResponse | undefined;
  orderLine: OrderLine;
  propProductName: string;
  remainingQty: number;
  isOverAllocated: boolean;
}): HeaderMetadata {
  const { order, orderLine, propProductName, remainingQty, isOverAllocated } = params;
  const oInfo = getOrderInfo(order);
  const pInfo = getProductInfo(orderLine, propProductName);

  return {
    ...oInfo,
    productCode: pInfo.productCode,
    productName: pInfo.productName,
    deliveryDate: formatDate(orderLine.delivery_date || orderLine.due_date, { fallback: "未設定" }),
    orderQuantity: Number(orderLine.order_quantity ?? orderLine.quantity ?? 0),
    orderUnit: pInfo.unitInfo.orderUnit,
    inventoryUnit: pInfo.unitInfo.inventoryUnit,
    isComplete: remainingQty === 0 && !isOverAllocated,
  };
}

export function LotAllocationHeader(props: LotAllocationHeaderProps) {
  const meta = getHeaderMetadata({
    order: props.order,
    orderLine: props.orderLine,
    propProductName: props.productName,
    remainingQty: props.remainingQty,
    isOverAllocated: props.isOverAllocated,
  });

  return (
    <LotAllocationHeaderView
      {...props}
      orderNumber={meta.orderNumber}
      productCode={meta.productCode}
      productName={meta.productName}
      deliveryDate={meta.deliveryDate}
      orderUnit={meta.orderUnit}
      inventoryUnit={meta.inventoryUnit}
      orderQuantity={meta.orderQuantity}
      isComplete={meta.isComplete}
      justSaved={false}
      supplierName={props.orderLine.supplier_name || undefined}
      lockedBy={meta.lockedBy || undefined}
      lockedAt={meta.lockedAt || undefined}
    />
  );
}
