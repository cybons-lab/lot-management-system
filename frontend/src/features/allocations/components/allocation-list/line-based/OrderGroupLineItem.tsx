import { CheckCircle } from "lucide-react";

import { useAllocationContextData } from "../../../hooks/useAllocationContext";
import { AllocationRowContainer } from "../../lots/AllocationRowContainer";
import * as styles from "../LineBasedAllocationList.styles";

import { getDeliveryPlaceName, getProductName } from "./helpers";
import { type LineWithOrderInfo } from "./types";

interface OrderGroupLineItemProps {
  lineItem: LineWithOrderInfo;
  isChecked: boolean;
  onLineCheckChange: (lineId: number, checked: boolean) => void;
}

/**
 * OrderGroupLineItem - グループ内の明細アイテム
 *
 * AllocationRowContainerはuseAllocationContextからハンドラーを取得するため、
 * ここでのProps数を大幅に削減。
 */
export function OrderGroupLineItem({
  lineItem,
  isChecked,
  onLineCheckChange,
}: OrderGroupLineItemProps) {
  // productMapはJotai atomから取得
  const { productMap } = useAllocationContextData();
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
          <span className="text-sm text-gray-600">{getProductName(lineItem.line, productMap)}</span>
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
          />
        </div>
      )}
    </div>
  );
}
