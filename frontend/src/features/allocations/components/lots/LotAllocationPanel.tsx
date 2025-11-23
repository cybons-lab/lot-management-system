import type { CandidateLotItem } from "../../api";
import { getCustomerName, getDeliveryPlaceName, getProductName } from "../../utils/orderLineUtils";

import { AllocationEmptyState } from "./AllocationEmptyState";
import { LotAllocationHeader } from "./LotAllocationHeader";
import { LotAllocationList } from "./LotAllocationList";
import { useAllocationCalculations } from "./hooks/useAllocationCalculations";
import * as styles from "./styles";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";
import { cn } from "@/shared/libs/utils";

interface LotAllocationPanelProps {
  order?: OrderWithLinesResponse;
  orderLine: OrderLine | null;
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations?: () => void;

  canSave?: boolean;
  isOverAllocated?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  isSaving?: boolean;

  // Props for internal calculations (can be overridden)
  customerName?: string;
  productName?: string;

  // Active state management
  isActive?: boolean;
  onActivate?: () => void;
}

/**
 * ロット引当パネル
 * 受注明細に対するロット引当を管理する
 */
export function LotAllocationPanel({
  order,
  orderLine,
  candidateLots,
  lotAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave = false,
  isLoading = false,
  error = null,
  isSaving = false,
  isOverAllocated = false,
  customerName: propCustomerName,
  productName: propProductName,
  isActive = false,
  onActivate,
}: LotAllocationPanelProps) {
  // 数量計算（カスタムフックで集約）
  const calculations = useAllocationCalculations({
    orderLine,
    lotAllocations,
  });

  const {
    requiredQty,
    totalAllocated,
    displayRemaining,
    progressPercent,
    remainingNeeded,
    isComplete,
    isOver,
  } = calculations;

  // インタラクション時にパネルをアクティブにする
  const handleInteraction = () => {
    if (onActivate) {
      onActivate();
    }
  };

  // 保存ハンドラー
  const handleSave = () => {
    if (onSaveAllocations && !isOverAllocated) {
      onSaveAllocations();
    }
  };

  // 明細未選択時
  if (!orderLine) {
    return <AllocationEmptyState type="no-orderline" />;
  }

  // データ取得（ユーティリティ関数で集約）
  const customerName = getCustomerName(order, orderLine, propCustomerName);
  const deliveryPlaceName = getDeliveryPlaceName(orderLine, candidateLots);
  const productName = getProductName(orderLine, propProductName);

  // スタイル状態の決定
  let panelState: "inactive" | "active" | "complete" | "error" = "inactive";
  if (isOver || isOverAllocated) {
    panelState = "error";
  } else if (isComplete) {
    panelState = "complete";
  } else if (isActive) {
    panelState = "active";
  }

  // Calculate allocation count and expiry warning
  const allocationCount = Object.values(lotAllocations).filter((qty) => qty > 0).length;

  // Simple expiry check: warn if any allocated lot expires within 30 days
  // Note: This is a simplified check. Ideally, we should compare with today's date properly.
  // Assuming candidateLots has expiry_date string "YYYY-MM-DD"
  const hasExpiryWarning = candidateLots.some((lot) => {
    const allocatedQty = lotAllocations[lot.lot_id] || 0;
    if (allocatedQty <= 0) return false;
    if (!lot.expiry_date) return false;

    const expiry = new Date(lot.expiry_date);
    const today = new Date();
    const warningThreshold = new Date();
    warningThreshold.setDate(today.getDate() + 30); // 30 days from now

    return expiry < warningThreshold;
  });

  return (
    <div
      className={cn(styles.panelWrapper, isLoading ? "pointer-events-none" : "")}
      onClick={handleInteraction}
      onFocus={handleInteraction}
      onMouseEnter={handleInteraction}
    >
      <div className={styles.panelRoot({ state: panelState })}>
        {/* ヘッダー部分 */}
        <div className={styles.panelHeader}>
          <LotAllocationHeader
            order={order}
            orderLine={orderLine}
            customerName={customerName}
            productName={productName}
            deliveryPlaceName={deliveryPlaceName}
            requiredQty={requiredQty}
            totalAllocated={totalAllocated}
            remainingQty={displayRemaining}
            progressPercent={progressPercent}
            isOverAllocated={isOverAllocated}
            onAutoAllocate={onAutoAllocate}
            onClearAllocations={onClearAllocations}
            onSaveAllocations={handleSave}
            canSave={canSave}
            isSaving={isSaving}
            isLoading={isLoading}
            hasCandidates={candidateLots.length > 0}
            allocationCount={allocationCount}
            hasExpiryWarning={hasExpiryWarning}
          />
        </div>

        {/* Header and Body Separator */}
        <div className="my-4 border-t-2 border-gray-100" />

        {/* ロット一覧エリア */}
        <div className={styles.panelBody}>
          {isLoading ? (
            <AllocationEmptyState type="loading" />
          ) : error ? (
            <AllocationEmptyState type="error" error={error} />
          ) : candidateLots.length === 0 ? (
            <AllocationEmptyState type="no-candidates" />
          ) : (
            <LotAllocationList
              candidateLots={candidateLots}
              lotAllocations={lotAllocations}
              remainingNeeded={remainingNeeded}
              requiredQty={requiredQty}
              customerId={order?.customer_id}
              deliveryPlaceId={orderLine?.delivery_place_id}
              productId={orderLine?.product_id}
              isActive={isActive}
              onLotAllocationChange={onLotAllocationChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
