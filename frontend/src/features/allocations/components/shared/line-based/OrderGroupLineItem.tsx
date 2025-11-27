import { CheckCircle } from "lucide-react";

import type { LineStatus } from "../../../hooks/useLotAllocation";
import { AllocationRowContainer } from "../../lots/AllocationRowContainer";
import * as styles from "../LineBasedAllocationList.styles";

import { getDeliveryPlaceName, getProductName } from "./helpers";
import { type LineWithOrderInfo } from "./types";

interface OrderGroupLineItemProps {
    lineItem: LineWithOrderInfo;
    isChecked: boolean;
    productMap: Record<number, string>;
    onLineCheckChange: (lineId: number, checked: boolean) => void;
    getLineAllocations: (lineId: number) => Record<number, number>;
    onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
    onAutoAllocate: (lineId: number) => void;
    onClearAllocations: (lineId: number) => void;
    onSaveAllocations: (lineId: number) => void;
    lineStatus: LineStatus;
    isOverAllocated: boolean;
    isActive: boolean;
    onActivate: () => void;
}

export function OrderGroupLineItem({
    lineItem,
    isChecked,
    productMap,
    onLineCheckChange,
    getLineAllocations,
    onLotAllocationChange,
    onAutoAllocate,
    onClearAllocations,
    onSaveAllocations,
    lineStatus,
    isOverAllocated,
    isActive,
    onActivate,
}: OrderGroupLineItemProps) {
    return (
        <div className={styles.orderCard(isChecked)}>
            <div className={styles.orderCardHeader(isChecked)}>
                <div className={styles.orderCardHeaderLeft}>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => onLineCheckChange(lineItem.id, e.target.checked)}
                        className={styles.checkbox}
                    />
                    <span className="text-sm font-medium text-gray-700">明細 #{lineItem.line.id}</span>
                    <span className="text-sm text-gray-600">
                        {getProductName(lineItem.line, productMap)}
                    </span>
                </div>
                {isChecked && (
                    <div className={styles.completedBadge}>
                        <CheckCircle className="h-4 w-4 text-green-700" />
                        <span className={styles.completedBadgeText}>完了</span>
                    </div>
                )}
            </div>
            {!isChecked && (
                <div className={styles.orderCardBody}>
                    <AllocationRowContainer
                        order={lineItem.order}
                        line={lineItem.line}
                        customerName={lineItem.customer_name}
                        productName={getProductName(lineItem.line, productMap)}
                        deliveryPlaceName={getDeliveryPlaceName(lineItem.order, lineItem.line)}
                        getLineAllocations={getLineAllocations}
                        onLotAllocationChange={onLotAllocationChange}
                        onAutoAllocate={onAutoAllocate}
                        onClearAllocations={onClearAllocations}
                        onSaveAllocations={onSaveAllocations}
                        lineStatus={lineStatus}
                        isOverAllocated={isOverAllocated}
                        isActive={isActive}
                        onActivate={onActivate}
                    />
                </div>
            )}
        </div>
    );
}
