import type { VirtualItem } from "@tanstack/react-virtual";

import { AllocationListRow } from "./line-based/AllocationListRow";
import { BulkActionsHeader } from "./line-based/BulkActionsHeader";
import { FilterBar } from "./line-based/FilterBar";
import { JumpButtons } from "./line-based/JumpButtons";
import type { AllocationListProps } from "./line-based/types";
import { useAllocationListLogic } from "./line-based/useAllocationListLogic";
import * as styles from "./LineBasedAllocationList.styles";

/**
 * LineBasedAllocationList - 明細単位でフラットに表示するコンポーネント
 *
 * ユーザーの要望により、Order Cardのデザイン（ヘッダー情報など）を維持したまま、
 * 明細行ごとにカードを分けて表示する（非正規化表示）。
 */
export function LineBasedAllocationList(props: AllocationListProps) {
  const { orders, isLoading } = props;

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
  } = useAllocationListLogic(props);

  if (isLoading) return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className="p-8 text-center text-gray-500">表示対象の受注がありません</div>;

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
              productMap={props.productMap}
              getLineAllocations={props.getLineAllocations}
              onLotAllocationChange={props.onLotAllocationChange}
              onAutoAllocate={props.onAutoAllocate}
              onClearAllocations={props.onClearAllocations}
              onSaveAllocations={props.onSaveAllocations}
              lineStatuses={props.lineStatuses}
              isOverAllocated={props.isOverAllocated}
            />
          );
        })}
      </div>
    </div>
  );
}
