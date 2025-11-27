import { Building2, Calendar } from "lucide-react";

import * as styles from "../LineBasedAllocationList.styles";
import { type GroupedOrder } from "./types";

interface OrderGroupHeaderProps {
    group: GroupedOrder;
    allLinesChecked: boolean;
    someLinesChecked: boolean;
    onGroupCheckChange: (groupId: number, checked: boolean) => void;
}

export function OrderGroupHeader({
    group,
    allLinesChecked,
    someLinesChecked,
    onGroupCheckChange,
}: OrderGroupHeaderProps) {
    return (
        <div className={styles.groupHeaderTitle}>
            <div className={styles.groupHeaderLeft}>
                <input
                    type="checkbox"
                    checked={allLinesChecked}
                    ref={(el) => {
                        if (el) el.indeterminate = someLinesChecked && !allLinesChecked;
                    }}
                    onChange={(e) => onGroupCheckChange(group.order_id, e.target.checked)}
                    className={styles.checkbox}
                />
                <span className={styles.orderLabel}>ORDER</span>
                <span className={styles.orderNumber}>{group.order_number}</span>
                <div className="h-4 w-px bg-blue-300" />
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-gray-800">{group.customer_name}</span>
                <Calendar className="ml-4 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">受注日: {group.order_date}</span>
            </div>
            <div className={styles.groupHeaderBadge}>{group.lines.length} 件の明細</div>
        </div>
    );
}
