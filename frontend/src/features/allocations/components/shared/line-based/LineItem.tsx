import { Building2, Calendar, CheckCircle } from "lucide-react";
import type { RefObject } from "react";

import { AllocationRowContainer } from "../../lots/AllocationRowContainer";
import * as styles from "../LineBasedAllocationList.styles";

import { getDeliveryPlaceName, getProductName } from "./helpers";
import type { LineWithOrderInfo } from "./types";

export function LineItem({
    item,
    isChecked,
    isFirstChecked,
    checkedSectionRef,
    totalCheckedCount,
    productMap,
    onCheckChange,
    getLineAllocations,
    onLotAllocationChange,
    onAutoAllocate,
    onClearAllocations,
    onSaveAllocations,
    lineStatuses,
    isOverAllocated,
    activeLineId,
    onActivate,
}: {
    item: LineWithOrderInfo;
    isChecked: boolean;
    isFirstChecked: boolean;
    checkedSectionRef?: RefObject<HTMLDivElement | null>;
    totalCheckedCount: number;
    productMap: Record<number, string>;
    onCheckChange: (lineId: number, checked: boolean) => void;
    getLineAllocations: (lineId: number) => Record<number, number>;
    onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
    onAutoAllocate: (lineId: number) => void;
    onClearAllocations: (lineId: number) => void;
    onSaveAllocations: (lineId: number) => void;
    lineStatuses: Record<number, any>;
    isOverAllocated: (lineId: number) => boolean;
    activeLineId: number | null;
    onActivate: (lineId: number) => void;
}) {
    return (
        <div className="pb-4">
            {/* マーカー */}
            {isFirstChecked && (
                <div ref={checkedSectionRef} className="mb-8 flex items-center gap-4 pt-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-medium text-green-700 shadow-sm">
                        <CheckCircle className="h-3 w-3" />
                        <span>ここからチェック済み ({totalCheckedCount}件)</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
            )}

            {/* Order Card UI (Denormalized) */}
            <div className={styles.orderCard(isChecked)}>
                {/* Header */}
                <div className={styles.orderCardHeader(isChecked)}>
                    <div className={styles.orderCardHeaderLeft}>
                        {/* Checkbox for single line */}
                        <div className="flex shrink-0 items-center">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => onCheckChange(item.id, e.target.checked)}
                                className={styles.checkbox}
                            />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={styles.orderLabel}>ORDER</span>
                            <span className={styles.orderNumber}>{item.order_number}</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300" />
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className={styles.customerName}>{item.customer_name}</span>
                        </div>
                    </div>
                    <div className={styles.orderCardHeaderRight}>
                        <div className={styles.orderDate}>
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="ml-1">受注日: {item.order_date}</span>
                        </div>
                        {isChecked && (
                            <div className={styles.completedBadge}>
                                <CheckCircle className="h-4 w-4 text-green-700" />
                                <span className={styles.completedBadgeText}>完了</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Line Detail */}
                {!isChecked && (
                    <div className={styles.orderCardBody}>
                        <AllocationRowContainer
                            order={item.order}
                            line={item.line}
                            customerName={item.customer_name}
                            productName={getProductName(item.line, productMap)}
                            deliveryPlaceName={getDeliveryPlaceName(item.order, item.line)}
                            getLineAllocations={getLineAllocations}
                            onLotAllocationChange={onLotAllocationChange}
                            onAutoAllocate={onAutoAllocate}
                            onClearAllocations={onClearAllocations}
                            onSaveAllocations={onSaveAllocations}
                            lineStatus={lineStatuses[item.id] || "clean"}
                            isOverAllocated={isOverAllocated(item.id)}
                            isActive={activeLineId === item.id}
                            onActivate={() => onActivate(item.id)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
