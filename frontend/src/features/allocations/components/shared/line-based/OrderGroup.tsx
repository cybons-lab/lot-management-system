import * as styles from "../LineBasedAllocationList.styles";

import { OrderGroupHeader } from "./OrderGroupHeader";
import { OrderGroupLineItem } from "./OrderGroupLineItem";
import type { GroupedOrder } from "./types";
import type { LineStatus } from "../../../hooks/useLotAllocation";

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
  lineStatuses: Record<number, LineStatus>;
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
                productMap={productMap}
                onLineCheckChange={onLineCheckChange}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

