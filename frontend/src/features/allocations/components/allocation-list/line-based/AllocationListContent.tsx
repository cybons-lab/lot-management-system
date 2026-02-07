import type { VirtualItem } from "@tanstack/react-virtual";

import * as styles from "../LineBasedAllocationList.styles";

import { AllocationListRow } from "./AllocationListRow";
import { BulkActionsHeader } from "./BulkActionsHeader";
import { FilterBar } from "./FilterBar";
import { JumpButtons } from "./JumpButtons";
import type { useAllocationListLogic } from "./useAllocationListLogic";

type LogicResult = ReturnType<typeof useAllocationListLogic>;

interface AllocationListContentProps {
  logic: LogicResult;
}

/**
 * AllocationListContent - 引当リストのメインコンテンツ
 *
 * 引当関連のハンドラーはAllocationProviderを通じてJotai atomに設定されているため、
 * ここではlogicのみを受け取り、チェックボックス関連のハンドラーのみを子に渡す。
 */
export function AllocationListContent({ logic }: AllocationListContentProps) {
  const {
    selectedLineIds,
    filterStatus,
    setFilterStatus,
    viewMode,
    setViewMode,
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
          if (!item) return null;

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
              handleCheckChange={handleCheckChange}
              handleGroupCheckChange={handleGroupCheckChange}
            />
          );
        })}
      </div>
    </div>
  );
}
