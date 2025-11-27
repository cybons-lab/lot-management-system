import { Building2, Calendar, CheckCircle } from "lucide-react";

import * as styles from "../LineBasedAllocationList.styles";

import { type LineWithOrderInfo } from "./types";

interface LineItemHeaderProps {
    item: LineWithOrderInfo;
    isChecked: boolean;
    onCheckChange: (lineId: number, checked: boolean) => void;
}

export function LineItemHeader({ item, isChecked, onCheckChange }: LineItemHeaderProps) {
    return (
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
    );
}
