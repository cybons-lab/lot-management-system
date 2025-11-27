import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useState, useRef } from "react";

import type { CandidateLotItem } from "../../api";

import { BulkActionsHeader } from "./line-based/BulkActionsHeader";
import { FilterBar } from "./line-based/FilterBar";
import { JumpButtons } from "./line-based/JumpButtons";
import { LineItem } from "./line-based/LineItem";
import { OrderGroup } from "./line-based/OrderGroup";
import type { FilterStatus, ViewMode, LineWithOrderInfo, GroupedOrder } from "./line-based/types";
import { useLineData } from "./line-based/useLineData";
import * as styles from "./LineBasedAllocationList.styles";

import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import type { LineStatus } from "../../hooks/useLotAllocation";

/**
 * LineBasedAllocationList - 明細単位でフラットに表示するコンポーネント
 *
 * ユーザーの要望により、Order Cardのデザイン（ヘッダー情報など）を維持したまま、
 * 明細行ごとにカードを分けて表示する（非正規化表示）。
 */
export function LineBasedAllocationList({
  orders,
  isLoading,
  onSaveAllocations,
  customerMap,
  productMap,
  getLineAllocations,
  getCandidateLots,
  isOverAllocated,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  lineStatuses,
}: {
  orders: OrderWithLinesResponse[];
  isLoading: boolean;
  onSaveAllocations: (lineId: number) => void;
  customerMap: Record<number, string>;
  productMap: Record<number, string>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  isOverAllocated: (lineId: number) => boolean;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  lineStatuses: Record<number, LineStatus>;
}) {
  // 選択状態管理
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  // フィルタステータス
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  // アクティブな行ID
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  // グルーピング表示モード
  const [viewMode, setViewMode] = useState<ViewMode>("line");

  // スクロール用ref
  const checkedSectionRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToCheckedSection = () => {
    checkedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // データ処理フック
  const { allFlatLines, sortedLines, groupedOrders, firstCheckedIndex } = useLineData({
    orders,
    customerMap,
    filterStatus,
    selectedLineIds,
    getLineAllocations,
    getCandidateLots,
    isOverAllocated,
    viewMode,
  });

  // 全選択/解除
  const handleSelectAll = () => {
    const allIds = new Set(allFlatLines.map((item) => item.id));
    setSelectedLineIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedLineIds(new Set());
  };

  const handleBulkSave = () => {
    selectedLineIds.forEach((id) => onSaveAllocations(id));
  };

  const handleCheckChange = (lineId: number, checked: boolean) => {
    setSelectedLineIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(lineId);
      } else {
        newSet.delete(lineId);
      }
      return newSet;
    });
  };

  const handleGroupCheckChange = (groupId: number, checked: boolean) => {
    setSelectedLineIds((prev) => {
      const newSet = new Set(prev);
      const group = groupedOrders.find((g) => g.order_id === groupId);
      if (!group) return newSet;

      if (checked) {
        group.lines.forEach((line) => newSet.add(line.id));
      } else {
        group.lines.forEach((line) => newSet.delete(line.id));
      }
      return newSet;
    });
  };

  // 表示データ切り替え
  const data = viewMode === "line" ? sortedLines : groupedOrders;

  // 仮想スクロール設定
  const virtualizer = useWindowVirtualizer({
    count: data.length,
    estimateSize: () => 300,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

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
          const isLineMode = viewMode === "line";
          const item = data[virtualItem.index];

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
                  totalCheckedCount={sortedLines.length - firstCheckedIndex}
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
                  onActivate={setActiveLineId}
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
                  onActivate={setActiveLineId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
