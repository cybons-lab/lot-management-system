import { useEffect, useRef, useState } from "react";

import { LotAllocationHeaderView } from "./LotAllocationHeaderView";

import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

type Order = {
  order_number?: string | null;
};

interface LotAllocationHeaderProps {
  order?: Order;
  orderLine: OrderLine;

  customerName?: string;
  deliveryPlaceName?: string;
  productName?: string;

  requiredQty: number;
  totalAllocated: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  canSave: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
}

export function LotAllocationHeader({
  order,
  orderLine,
  customerName = "顧客未設定",
  deliveryPlaceName = "納入先未設定",
  productName: propProductName,
  requiredQty,
  totalAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave,
  isSaving,
  isLoading,
  hasCandidates,
}: LotAllocationHeaderProps) {
  const orderNumber = order?.order_number || "不明な受注";
  const productCode = orderLine.product_code || "CODE";
  const productName = propProductName || orderLine.product_name || "品名不明";
  const deliveryDate = formatDate(orderLine.delivery_date || orderLine.due_date, {
    fallback: "未設定",
  });

  const [justSaved, setJustSaved] = useState(false);
  const prevSavingRef = useRef(isSaving);

  useEffect(() => {
    if (prevSavingRef.current && !isSaving) {
      setJustSaved(true);
      const timer = setTimeout(() => {
        setJustSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevSavingRef.current = isSaving;
  }, [isSaving]);

  const isComplete = remainingQty === 0 && !isOverAllocated;

  return (
    <LotAllocationHeaderView
      orderNumber={orderNumber}
      customerName={customerName}
      deliveryPlaceName={deliveryPlaceName}
      deliveryDate={deliveryDate}
      productCode={productCode}
      productName={productName}
      unit={orderLine.unit || ""}
      requiredQty={requiredQty}
      totalAllocated={totalAllocated}
      remainingQty={remainingQty}
      progressPercent={progressPercent}
      isOverAllocated={isOverAllocated}
      isComplete={isComplete}
      justSaved={justSaved}
      isSaving={isSaving}
      isLoading={isLoading}
      hasCandidates={hasCandidates}
      onAutoAllocate={onAutoAllocate}
      onClearAllocations={onClearAllocations}
      onSaveAllocations={onSaveAllocations}
      canSave={canSave}
      supplierName={orderLine.supplier_name || undefined}
    />
  );
}
