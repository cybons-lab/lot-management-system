import type { useWindowVirtualizer, VirtualItem } from "@tanstack/react-virtual";

import { LineItem } from "./LineItem";
import { OrderGroup } from "./OrderGroup";
import type { GroupedOrder, LineWithOrderInfo, ViewMode } from "./types";

interface AllocationListRowProps {
  virtualItem: VirtualItem;
  virtualizer: ReturnType<typeof useWindowVirtualizer>;
  item: LineWithOrderInfo | GroupedOrder;
  viewMode: ViewMode;
  selectedLineIds: Set<number>;
  firstCheckedIndex: number;
  sortedLinesLength: number;
  checkedSectionRef: React.RefObject<HTMLDivElement | null>;
  // Handler props (only for check handling - allocation handlers come from context)
  handleCheckChange: (lineId: number, checked: boolean) => void;
  handleGroupCheckChange: (groupId: number, checked: boolean) => void;
}

/**
 * AllocationListRow - 仮想スクロールリストの行コンポーネント
 *
 * 引当関連のハンドラーはuseAllocationContextから取得されるため、
 * ここではチェックボックス関連のハンドラーのみをpropsで受け取る。
 */
export function AllocationListRow({
  virtualItem,
  virtualizer,
  item,
  viewMode,
  selectedLineIds,
  firstCheckedIndex,
  sortedLinesLength,
  checkedSectionRef,
  handleCheckChange,
  handleGroupCheckChange,
}: AllocationListRowProps) {
  const isLineMode = viewMode === "line";

  return (
    <div
      key={virtualItem.key}
      data-index={virtualItem.index}
      ref={virtualizer.measureElement}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      {isLineMode ? (
        <LineItem
          item={item as LineWithOrderInfo}
          isChecked={selectedLineIds.has((item as LineWithOrderInfo).id)}
          isFirstChecked={virtualItem.index === firstCheckedIndex && firstCheckedIndex > 0}
          checkedSectionRef={checkedSectionRef}
          totalCheckedCount={sortedLinesLength - firstCheckedIndex}
          onCheckChange={handleCheckChange}
        />
      ) : (
        <OrderGroup
          group={item as GroupedOrder}
          selectedLineIds={selectedLineIds}
          onGroupCheckChange={handleGroupCheckChange}
          onLineCheckChange={handleCheckChange}
        />
      )}
    </div>
  );
}
