import * as styles from "../LineBasedAllocationList.styles";

import { OrderGroupHeader } from "./OrderGroupHeader";
import { OrderGroupLineItem } from "./OrderGroupLineItem";
import type { GroupedOrder } from "./types";

interface OrderGroupProps {
  group: GroupedOrder;
  selectedLineIds: Set<number>;
  onGroupCheckChange: (groupId: number, checked: boolean) => void;
  onLineCheckChange: (lineId: number, checked: boolean) => void;
}

/**
 * OrderGroup - 受注グループコンポーネント
 *
 * 引当関連のハンドラーはuseAllocationContextから取得されるため、
 * ここではチェックボックス関連のpropsのみを受け取る。
 */
export function OrderGroup({
  group,
  selectedLineIds,
  onGroupCheckChange,
  onLineCheckChange,
}: OrderGroupProps) {
  const allLinesChecked = group.lines.every((line) => selectedLineIds.has(line.id));
  const someLinesChecked = group.lines.some((line) => selectedLineIds.has(line.id));

  return (
    <div className="pb-6">
      <div className={styles.groupHeaderContainer}>
        {/* グループヘッダー */}
        <OrderGroupHeader
          group={group}
          allLinesChecked={allLinesChecked}
          someLinesChecked={someLinesChecked}
          onGroupCheckChange={onGroupCheckChange}
        />

        {/* 明細リスト */}
        <div className={styles.groupLinesContainer}>
          {group.lines.map((lineItem) => {
            const isChecked = selectedLineIds.has(lineItem.id);

            return (
              <OrderGroupLineItem
                key={lineItem.id}
                lineItem={lineItem}
                isChecked={isChecked}
                onLineCheckChange={onLineCheckChange}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
