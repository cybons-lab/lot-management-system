import { Building2, Calendar, CheckCircle } from "lucide-react";

import { AllocationRowContainer } from "../../lots/AllocationRowContainer";
import * as styles from "../LineBasedAllocationList.styles";

import { getDeliveryPlaceName, getProductName } from "./helpers";
import type { GroupedOrder } from "./types";

export function OrderGroup({
  group,
  selectedLineIds,
  onGroupCheckChange,
  onLineCheckChange,
  productMap,
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
  group: GroupedOrder;
  selectedLineIds: Set<number>;
  onGroupCheckChange: (groupId: number, checked: boolean) => void;
  onLineCheckChange: (lineId: number, checked: boolean) => void;
  productMap: Record<number, string>;
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
  const allLinesChecked = group.lines.every((line) => selectedLineIds.has(line.id));
  const someLinesChecked = group.lines.some((line) => selectedLineIds.has(line.id));

  return (
    <div className="pb-6">
      <div className={styles.groupHeaderContainer}>
        {/* グループヘッダー */}
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

        {/* 明細リスト */}
        <div className={styles.groupLinesContainer}>
          {group.lines.map((lineItem) => {
            const isChecked = selectedLineIds.has(lineItem.id);

            return (
              <div key={lineItem.id} className={styles.orderCard(isChecked)}>
                <div className={styles.orderCardHeader(isChecked)}>
                  <div className={styles.orderCardHeaderLeft}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => onLineCheckChange(lineItem.id, e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      明細 #{lineItem.line.id}
                    </span>
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
                      lineStatus={lineStatuses[lineItem.id] || "clean"}
                      isOverAllocated={isOverAllocated(lineItem.id)}
                      isActive={activeLineId === lineItem.id}
                      onActivate={() => onActivate(lineItem.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
