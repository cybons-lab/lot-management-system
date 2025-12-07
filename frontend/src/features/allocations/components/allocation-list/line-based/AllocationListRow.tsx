import type { useWindowVirtualizer, VirtualItem } from "@tanstack/react-virtual";

import { LineItem } from "./LineItem";
import { OrderGroup } from "./OrderGroup";
import type { AllocationListProps, GroupedOrder, LineWithOrderInfo, ViewMode } from "./types";

interface AllocationListRowProps {
  virtualItem: VirtualItem;
  virtualizer: ReturnType<typeof useWindowVirtualizer>;
  item: LineWithOrderInfo | GroupedOrder;
  viewMode: ViewMode;
  selectedLineIds: Set<number>;
  firstCheckedIndex: number;
  sortedLinesLength: number;
  checkedSectionRef: React.RefObject<HTMLDivElement | null>;
  activeLineId: number | null;
  onActivate: (id: number | null) => void;
  // Handler props
  handleCheckChange: (lineId: number, checked: boolean) => void;
  handleGroupCheckChange: (groupId: number, checked: boolean) => void;
  // Props from AllocationListProps needed
  productMap: AllocationListProps["productMap"];
  getLineAllocations: AllocationListProps["getLineAllocations"];
  onLotAllocationChange: AllocationListProps["onLotAllocationChange"];
  onAutoAllocate: AllocationListProps["onAutoAllocate"];
  onClearAllocations: AllocationListProps["onClearAllocations"];
  onSaveAllocations: AllocationListProps["onSaveAllocations"];
  lineStatuses: AllocationListProps["lineStatuses"];
  isOverAllocated: AllocationListProps["isOverAllocated"];
}

export function AllocationListRow({
  virtualItem,
  virtualizer,
  item,
  viewMode,
  selectedLineIds,
  firstCheckedIndex,
  sortedLinesLength,
  checkedSectionRef,
  activeLineId,
  onActivate,
  handleCheckChange,
  handleGroupCheckChange,
  productMap,
  getLineAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  lineStatuses,
  isOverAllocated,
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
          productMap={productMap}
          onCheckChange={handleCheckChange}
          getLineAllocations={getLineAllocations}
          onLotAllocationChange={onLotAllocationChange}
          onAutoAllocate={onAutoAllocate}
          onClearAllocations={onClearAllocations}
          onSaveAllocations={onSaveAllocations}
          lineStatuses={lineStatuses}
          isOverAllocated={isOverAllocated}
          activeLineId={activeLineId}
          onActivate={onActivate}
        />
      ) : (
        <OrderGroup
          group={item as GroupedOrder}
          selectedLineIds={selectedLineIds}
          onGroupCheckChange={handleGroupCheckChange}
          onLineCheckChange={handleCheckChange}
          productMap={productMap}
          getLineAllocations={getLineAllocations}
          onLotAllocationChange={onLotAllocationChange}
          onAutoAllocate={onAutoAllocate}
          onClearAllocations={onClearAllocations}
          onSaveAllocations={onSaveAllocations}
          lineStatuses={lineStatuses}
          isOverAllocated={isOverAllocated}
          activeLineId={activeLineId}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}
