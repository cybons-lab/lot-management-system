import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";

import type { FilterStatus, ViewMode, AllocationListProps } from "./types";
import { useAllocationHandlers } from "./useAllocationHandlers";
import { useLineData } from "./useLineData";

export function useAllocationListLogic({
  orders,
  customerMap,
  getLineAllocations,
  getCandidateLots,
  isOverAllocated,
  onSaveAllocations,
}: AllocationListProps) {
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

  const handlers = useAllocationHandlers({
    selectedLineIds,
    setSelectedLineIds,
    allFlatLines,
    groupedOrders,
    onSaveAllocations,
  });

  // 表示データ切り替え
  const data = viewMode === "line" ? sortedLines : groupedOrders;

  // 仮想スクロール設定
  const virtualizer = useWindowVirtualizer({
    count: data.length,
    estimateSize: () => 300,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return {
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
    groupedOrders,
    firstCheckedIndex,
    data,
    scrollToCheckedSection,
    virtualizer,
    ...handlers,
  };
}
