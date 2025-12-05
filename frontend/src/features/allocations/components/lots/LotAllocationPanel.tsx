import type { CandidateLotItem } from "../../api";
import { getCustomerName, getDeliveryPlaceName, getProductName } from "../../utils/orderLineUtils";

import { AllocationEmptyState } from "./AllocationEmptyState";
import { useAllocationCalculations } from "./hooks/useAllocationCalculations";
import { LotAllocationHeader } from "./LotAllocationHeader";
import { LotAllocationList } from "./LotAllocationList";
import * as styles from "./styles";

import { cn } from "@/shared/libs/utils";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";

interface LotAllocationPanelProps {
  order?: OrderWithLinesResponse;
  orderLine: OrderLine | null;
  candidateLots: CandidateLotItem[];
  lotAllocations: Record<number, number>;
  onLotAllocationChange: (lotId: number, quantity: number) => void;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations?: () => void;
  onConfirmHard?: () => void;

  canSave?: boolean;
  isOverAllocated?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  isSaving?: boolean;

  // Props for internal calculations (can be overridden)
  customerName?: string;
  productName?: string;
  deliveryPlaceName?: string;

  // Active state management
  isActive?: boolean;
  onActivate?: () => void;

  // New props
  hardAllocated?: number;
  softAllocated?: number;
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
  onConfirmHard,
  canSave = false,
  isLoading = false,
  error = null,
  isSaving = false,
  isOverAllocated = false,
  customerName: propCustomerName,
  productName: propProductName,
  deliveryPlaceName: propDeliveryPlaceName,
  isActive = false,
  onActivate,
  hardAllocated,
  softAllocated,
}: LotAllocationPanelProps & { deliveryPlaceName?: string }) {
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
  // 優先順位: prop > line > candidate
  const deliveryPlaceName = propDeliveryPlaceName || getDeliveryPlaceName(orderLine, candidateLots);
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

  // Calculate allocation count and expiry warning/error
  const allocationCount = Object.values(lotAllocations).filter((qty) => qty > 0).length;

  // Expiry check logic
  let hasExpiryWarning = false;
  let hasExpiredError = false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningThreshold = new Date(today);
  warningThreshold.setDate(today.getDate() + 30); // 30 days from now

  for (const lot of candidateLots) {
    const allocatedQty = lotAllocations[lot.lot_id] || 0;
    if (allocatedQty <= 0) continue;
    if (!lot.expiry_date) continue;

    const expiry = new Date(lot.expiry_date);

    // Check for expired (Error)
    if (expiry < today) {
      hasExpiredError = true;
    }
    // Check for near expiry (Warning)
    else if (expiry <= warningThreshold) {
      hasExpiryWarning = true;
    }
  }

  return (
    <div
      className={cn(styles.panelWrapper, isLoading ? "pointer-events-none" : "")}
      onClick={handleInteraction}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleInteraction();
        }
      }}
      role="button"
      tabIndex={0}
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
            hardAllocated={hardAllocated}
            softAllocated={softAllocated}
            remainingQty={displayRemaining}
            progressPercent={progressPercent}
            isOverAllocated={isOverAllocated}
            isLoading={isLoading}
            hasCandidates={candidateLots.length > 0}
            allocationCount={allocationCount}
            hasExpiryWarning={hasExpiryWarning}
            hasExpiredError={hasExpiredError}
            lineStatus={orderLine.status}
          />
        </div>

        {/* Header and Body Separator */}
        <div className="my-4 border-t-2 border-gray-100" />

        {/* ロット一覧エリア */}
        <div className={styles.panelBody}>
          <div className="mb-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoAllocate}
              disabled={isSaving || isComplete}
            >
              自動割当
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllocations}
              disabled={isSaving || allocationCount === 0}
            >
              クリア
            </Button>
          </div>

          {isLoading ? (
            <AllocationEmptyState type="loading" />
          ) : error ? (
            <AllocationEmptyState type="error" error={error} />
          ) : candidateLots.length === 0 ? (
            <AllocationEmptyState type="no-candidates" />
          ) : (
            <>
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

              <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  className="min-w-[6rem] bg-blue-600 font-bold text-white hover:bg-blue-700"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
                {onConfirmHard && (
                  <Button
                    onClick={onConfirmHard}
                    disabled={isSaving || !canSave}
                    className="bg-purple-600 font-bold text-white hover:bg-purple-700"
                  >
                    Hard確定
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
