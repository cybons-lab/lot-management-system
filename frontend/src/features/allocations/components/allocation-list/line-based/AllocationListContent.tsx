import type { VirtualItem } from "@tanstack/react-virtual";

import * as styles from "../LineBasedAllocationList.styles";

import { AllocationListRow } from "./AllocationListRow";
import { BulkActionsHeader } from "./BulkActionsHeader";
import { FilterBar } from "./FilterBar";
import { JumpButtons } from "./JumpButtons";
import type { AllocationListProps } from "./types";
import type { useAllocationListLogic } from "./useAllocationListLogic";

type LogicResult = ReturnType<typeof useAllocationListLogic>;

interface AllocationListContentProps extends AllocationListProps {
  logic: LogicResult;
}

// Pure presentation component with many props passed down - difficult to split further naturally
// eslint-disable-next-line max-lines-per-function
export function AllocationListContent(props: AllocationListContentProps) {
  const { logic, ...parentProps } = props;
  const {
    selectedLineIds,
    filterStatus,
    setFilterStatus,
    viewMode,
    setViewMode,
    activeLineId,
    setActiveLineId,
    checkedSectionRef,
    listRef,
    allFlatLines,
    sortedLines,
    data,
    firstCheckedIndex,
    handleSelectAll,
    handleDeselectAll,
    handleBulkSave,
    handleCheckChange,
    handleGroupCheckChange,
    scrollToCheckedSection,
    virtualizer,
  } = logic;

  // early returns are handled in parent or here? Parent handles loading/empty.
  // But logic hook result doesn't have isLoading/orders... oh wait props does.
  // Parent should handle loading/empty checks before rendering this content,
  // OR this content handles it.
  // Previous code had loading checks after hook call.
  // Logic hook uses props. So if props.orders is empty, logic works fine?
  // Let's assume parent handles Loading/Empty state to keep this pure content.

  return (
    <div ref={listRef} className={styles.root}>
      {/* 一括操作ヘッダー */}
      {allFlatLines.length > 0 && (
        <BulkActionsHeader
          selectedCount={selectedLineIds.size}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkSave={handleBulkSave}
        />
      )}

      {/* フィルタリングバー */}
      <FilterBar
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        viewMode={viewMode}
        onViewModeToggle={() => setViewMode(viewMode === "line" ? "order" : "line")}
      />

      {/* ジャンプボタン */}
      {allFlatLines.length > 0 && (
        <JumpButtons
          onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          onScrollToChecked={scrollToCheckedSection}
        />
      )}

      {/* 仮想スクロールリスト */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
          const item = data[virtualItem.index];

          return (
            <AllocationListRow
              key={virtualItem.key}
              virtualItem={virtualItem}
              virtualizer={virtualizer}
              item={item}
              viewMode={viewMode}
              selectedLineIds={selectedLineIds}
              firstCheckedIndex={firstCheckedIndex}
              sortedLinesLength={sortedLines.length}
              checkedSectionRef={checkedSectionRef}
              activeLineId={activeLineId}
              onActivate={setActiveLineId}
              handleCheckChange={handleCheckChange}
              handleGroupCheckChange={handleGroupCheckChange}
              productMap={parentProps.productMap}
              getLineAllocations={parentProps.getLineAllocations}
              onLotAllocationChange={parentProps.onLotAllocationChange}
              onAutoAllocate={parentProps.onAutoAllocate}
              onClearAllocations={parentProps.onClearAllocations}
              onSaveAllocations={parentProps.onSaveAllocations}
              lineStatuses={parentProps.lineStatuses}
              isOverAllocated={parentProps.isOverAllocated}
            />
          );
        })}
      </div>
    </div>
  );
}
