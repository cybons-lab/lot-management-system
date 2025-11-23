import { useMemo, useState, useRef } from "react";
import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  Filter,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Calendar,
  Building2,
  Layers,
  X,
} from "lucide-react";

import type { OrderWithLinesResponse, OrderLine } from "@/shared/types/aliases";
import { cn } from "../../../../shared/libs/utils";
import { Button } from "../../../../components/ui";

import type { CandidateLotItem } from "../../api";
import { getOrderQuantity } from "../../hooks/useLotAllocation/allocationFieldHelpers";
import { getLineAllocationStatus } from "./FlatAllocationList"; // reuse helper
import { AllocationRowContainer } from "../lots/AllocationRowContainer";

import * as styles from "./LineBasedAllocationList.styles";

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
  lineStatuses: Record<number, any>;
}) {
  // 選択状態管理
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  // フィルタステータス
  type FilterStatus = "all" | "complete" | "shortage" | "over" | "unallocated";
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  // アクティブな行ID
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  // グルーピング表示モード
  type ViewMode = "line" | "order";
  const [viewMode, setViewMode] = useState<ViewMode>("line");

  // スクロール用ref
  const checkedSectionRef = useRef<HTMLDivElement>(null);

  const scrollToCheckedSection = () => {
    checkedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ヘルパー: 顧客名取得
  const getCustomerName = useMemo(
    () => (order: OrderWithLinesResponse) => {
      if (order.customer_id) {
        return customerMap[order.customer_id] || order.customer_name || "顧客未設定";
      }
      return order.customer_name || "顧客未設定";
    },
    [customerMap],
  );

  // ヘルパー: 商品名取得
  const getProductName = (line: OrderLine) => {
    if (line.product_name) return line.product_name;
    if (line.product_id && productMap[line.product_id]) return productMap[line.product_id];
    return "商品名不明";
  };

  // ヘルパー: 納入先名取得
  const getDeliveryPlaceName = (order: OrderWithLinesResponse, line: OrderLine) => {
    // 明細の納入先 > オーダーの納入先 > 未設定
    if (line.delivery_place_name) return line.delivery_place_name;
    if (order.delivery_place_name) return order.delivery_place_name;
    return undefined; // AllocationRowContainer側でデフォルト処理させるか、ここで"未設定"を返すか。
    // ここではundefinedを返し、AllocationRowContainer -> LotAllocationPanel -> orderLineUtilsで解決させる
    // ただし、order.delivery_place_nameがある場合はそれを優先させたいので、ここで解決して渡すのが良い
  };

  // 1. 全明細をフラット化し、Order情報を付与
  type LineWithOrderInfo = {
    id: number;
    line: OrderLine;
    order: OrderWithLinesResponse;
    order_number: string;
    customer_name: string;
    order_date: string;
    order_id: number;
  };

  const allFlatLines: LineWithOrderInfo[] = useMemo(() => {
    return orders.flatMap((order) => {
      if (!order.lines) return [];
      return order.lines
        .map((line) => {
          if (!line.id) return null;
          return {
            id: line.id,
            line: line,
            order: order,
            order_number: order.order_number || order.order_no || `#${order.id} `,
            customer_name: getCustomerName(order),
            order_date: order.order_date ? String(order.order_date) : "",
            order_id: order.id!,
          };
        })
        .filter((item): item is LineWithOrderInfo => item !== null);
    });
  }, [orders, customerMap]);

  // 2. フィルタリング
  const filteredLines = useMemo(() => {
    return allFlatLines.filter((item) => {
      if (filterStatus === "all") return true;

      const line = item.line;
      const allocations = getLineAllocations(line.id);
      const required = getOrderQuantity(line);
      const candidates = getCandidateLots(line.id);
      const hasCandidates = candidates.length > 0;
      const isOver = isOverAllocated(line.id);
      const status = getLineAllocationStatus(line, allocations, required, isOver);

      switch (filterStatus) {
        case "complete":
          return status === "completed";
        case "shortage":
          // ユーザー要望: 候補なしも在庫不足として扱う
          return (status === "shortage" || (status as string) === "no-candidates") && required > 0;
        case "over":
          return status === "over";
        case "unallocated":
          // 未引当かつ候補あり（純粋な未着手）
          return status === "unallocated" && hasCandidates;
        default:
          return true;
      }
    });
  }, [allFlatLines, filterStatus, getLineAllocations, getCandidateLots, isOverAllocated]);

  // 3. ソート（チェック済みを下に）
  const sortedLines = useMemo(() => {
    return [...filteredLines].sort((a, b) => {
      const aChecked = selectedLineIds.has(a.id);
      const bChecked = selectedLineIds.has(b.id);
      if (aChecked === bChecked) return 0;
      return aChecked ? 1 : -1;
    });
  }, [filteredLines, selectedLineIds]);

  const firstCheckedIndex = sortedLines.findIndex((item) => selectedLineIds.has(item.id));

  // 4. グルーピング（受注単位）
  type GroupedOrder = {
    order_id: number;
    order_number: string;
    customer_name: string;
    order_date: string;
    lines: LineWithOrderInfo[];
  };

  const groupedOrders: GroupedOrder[] = useMemo(() => {
    if (viewMode === "line") return [];

    const orderMap = new Map<number, GroupedOrder>();
    sortedLines.forEach((item) => {
      if (!orderMap.has(item.order_id)) {
        orderMap.set(item.order_id, {
          order_id: item.order_id,
          order_number: item.order_number,
          customer_name: item.customer_name,
          order_date: item.order_date,
          lines: [],
        });
      }
      orderMap.get(item.order_id)!.lines.push(item);
    });

    return Array.from(orderMap.values());
  }, [sortedLines, viewMode]);

  // 仮想スクロール設定
  const listRef = useRef<HTMLDivElement>(null);

  // 表示データ切り替え
  const data = viewMode === "line" ? sortedLines : groupedOrders;

  const virtualizer = useWindowVirtualizer({
    count: data.length,
    estimateSize: () => 300,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className="p-8 text-center text-gray-500">表示対象の受注がありません</div>;

  return (
    <div ref={listRef} className={styles.root}>
      {/* 一括操作ヘッダー */}
      {allFlatLines.length > 0 && (
        <div className={styles.bulkActionsHeader}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.bulkActionsLabel}>一括操作:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 text-xs"
            >
              <span className="i-lucide-check-square mr-1.5 h-4 w-4" />
              全選択
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedLineIds.size === 0}
              className="h-8 text-xs"
            >
              <span className="i-lucide-square mr-1.5 h-4 w-4" />
              選択解除
            </Button>
          </div>
          <div className={styles.bulkActionsRight}>
            <span className={styles.bulkActionsSelectedCount}>{selectedLineIds.size} 件選択中</span>
            <Button
              type="button"
              onClick={handleBulkSave}
              disabled={selectedLineIds.size === 0}
              className="h-8 bg-blue-600 text-xs font-bold hover:bg-blue-700"
            >
              <span className="i-lucide-save mr-1.5 h-4 w-4" />
              選択した行を一括保存
            </Button>
          </div>
        </div>
      )}

      {/* フィルタリングバー (Sticky) */}
      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>
          <Filter className="h-4 w-4" />
          <span>フィルタ:</span>
        </div>
        {/* フィルタボタン群 (FlatAllocationListと同じ) */}
        {[
          { id: "all", label: "すべて", color: "gray-800" },
          { id: "complete", label: "引当完了", color: "blue-600" },
          { id: "shortage", label: "在庫不足", color: "red-600" }, // 黄色から赤に変更（候補なしを含むため）
          { id: "over", label: "在庫過剰", color: "orange-500" },
          { id: "unallocated", label: "未引当", color: "gray-500" },
        ].map((f) => (
          <Button
            key={f.id}
            variant={filterStatus === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(f.id as FilterStatus)}
            className={cn(
              "h-7 rounded-full text-xs",
              filterStatus === f.id
                ? f.id === "all"
                  ? "bg-gray-800"
                  : `bg-${f.color.split("-")[0]}-${f.color.split("-")[1]}`
                : `border-${f.color.split("-")[0]}-200 text-${f.color.split("-")[0]}-600 hover:bg-${f.color.split("-")[0]}-50`,
            )}
          >
            {f.label}
          </Button>
        ))}

        {/* フィルタクリアボタン */}
        {filterStatus !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterStatus("all")}
            className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="mr-1 h-3 w-3" />
            クリア
          </Button>
        )}

        {/* グルーピングトグル */}
        <div className={styles.groupingToggleContainer}>
          <span className={styles.groupingToggleLabel}>グルーピング:</span>
          <Button
            type="button"
            variant={viewMode === "order" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(viewMode === "line" ? "order" : "line")}
            className="h-7 rounded-full text-xs"
          >
            <Layers className="mr-1.5 h-3 w-3" />
            {viewMode === "order" ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      {/* ジャンプボタン - 常時表示 */}
      {allFlatLines.length > 0 && (
        <div className={styles.jumpButtonContainer}>
          {/* TOP ボタン */}
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-blue-700"
            title="トップへ"
          >
            <ArrowUp className="h-6 w-6 stroke-[3] text-white" />
            <span className="text-[10px] font-bold text-white">TOP</span>
          </Button>

          {/* CHK ボタン - 常時表示 */}
          <Button
            onClick={scrollToCheckedSection}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-green-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-green-700"
            title="チェック済みセクションへ"
          >
            <ArrowDown className="h-6 w-6 stroke-[3] text-white" />
            <span className="text-[10px] font-bold text-white">CHK</span>
          </Button>
        </div>
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
              {isLineMode
                ? // 明細モード
                  (() => {
                    const lineItem = item as LineWithOrderInfo;
                    const isChecked = selectedLineIds.has(lineItem.id);
                    const isFirstChecked =
                      virtualItem.index === firstCheckedIndex && firstCheckedIndex > 0;

                    return (
                      <div className="pb-4">
                        {/* マーカー */}
                        {isFirstChecked && (
                          <div
                            ref={checkedSectionRef}
                            className="mb-8 flex items-center gap-4 pt-4"
                          >
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-medium text-green-700 shadow-sm">
                              <CheckCircle className="h-3 w-3" />
                              <span>
                                ここからチェック済み ({sortedLines.length - firstCheckedIndex}件)
                              </span>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                          </div>
                        )}

                        {/* Order Card UI (Denormalized) */}
                        <div className={styles.orderCard(isChecked)}>
                          {/* Header */}
                          <div className={styles.orderCardHeader(isChecked)}>
                            <div className={styles.orderCardHeaderLeft}>
                              {/* Checkbox for single line */}
                              <div className="flex shrink-0 items-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedLineIds((prev) => {
                                      const newSet = new Set(prev);
                                      if (isChecked) newSet.delete(lineItem.id);
                                      else newSet.add(lineItem.id);
                                      return newSet;
                                    });
                                  }}
                                  className={styles.checkbox}
                                />
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className={styles.orderLabel}>ORDER</span>
                                <span className={styles.orderNumber}>{lineItem.order_number}</span>
                              </div>
                              <div className="h-4 w-px bg-gray-300" />
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className={styles.customerName}>
                                  {lineItem.customer_name}
                                </span>
                              </div>
                            </div>
                            <div className={styles.orderCardHeaderRight}>
                              <div className={styles.orderDate}>
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="ml-1">受注日: {lineItem.order_date}</span>
                              </div>
                              {isChecked && (
                                <div className={styles.completedBadge}>
                                  <CheckCircle className="h-4 w-4 text-green-700" />
                                  <span className={styles.completedBadgeText}>完了</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Line Detail */}
                          {!isChecked && (
                            <div className={styles.orderCardBody}>
                              <AllocationRowContainer
                                order={lineItem.order}
                                line={lineItem.line}
                                customerName={lineItem.customer_name}
                                productName={getProductName(lineItem.line)}
                                deliveryPlaceName={getDeliveryPlaceName(
                                  lineItem.order,
                                  lineItem.line,
                                )}
                                getLineAllocations={getLineAllocations}
                                onLotAllocationChange={onLotAllocationChange}
                                onAutoAllocate={onAutoAllocate}
                                onClearAllocations={onClearAllocations}
                                onSaveAllocations={onSaveAllocations}
                                lineStatus={lineStatuses[lineItem.id] || "clean"}
                                isOverAllocated={isOverAllocated(lineItem.id)}
                                isActive={activeLineId === lineItem.id}
                                onActivate={() => setActiveLineId(lineItem.id)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                : // グルーピングモード
                  (() => {
                    const group = item as GroupedOrder;
                    const allLinesChecked = group.lines.every((line) =>
                      selectedLineIds.has(line.id),
                    );
                    const someLinesChecked = group.lines.some((line) =>
                      selectedLineIds.has(line.id),
                    );

                    return (
                      <div className="pb-6">
                        <div className={styles.groupHeaderContainer}>
                          {/* グループヘッダー */}
                          <div className={styles.groupHeaderTitle}>
                            <div className={styles.groupHeaderLeft}>
                              <input
                                type="checkbox"
                                checked={allLinesChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = someLinesChecked && !allLinesChecked;
                                }}
                                onChange={() => {
                                  setSelectedLineIds((prev) => {
                                    const newSet = new Set(prev);
                                    if (allLinesChecked) {
                                      group.lines.forEach((line) => newSet.delete(line.id));
                                    } else {
                                      group.lines.forEach((line) => newSet.add(line.id));
                                    }
                                    return newSet;
                                  });
                                }}
                                className={styles.checkbox}
                              />
                              <span className={styles.orderLabel}>ORDER</span>
                              <span className={styles.orderNumber}>{group.order_number}</span>
                              <div className="h-4 w-px bg-blue-300" />
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <span className="font-bold text-gray-800">{group.customer_name}</span>
                              <Calendar className="ml-4 h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                受注日: {group.order_date}
                              </span>
                            </div>
                            <div className={styles.groupHeaderBadge}>
                              {group.lines.length} 件の明細
                            </div>
                          </div>

                          {/* 明細リスト */}
                          <div className={styles.groupLinesContainer}>
                            {group.lines.map((lineItem) => {
                              const isChecked = selectedLineIds.has(lineItem.id);

                              return (
                                <div key={lineItem.id} className={styles.orderCard(isChecked)}>
                                  <div className={styles.orderCardHeader(isChecked)}>
                                    <div className={styles.orderCardHeaderLeft}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setSelectedLineIds((prev) => {
                                            const newSet = new Set(prev);
                                            if (isChecked) newSet.delete(lineItem.id);
                                            else newSet.add(lineItem.id);
                                            return newSet;
                                          });
                                        }}
                                        className={styles.checkbox}
                                      />
                                      <span className="text-sm font-medium text-gray-700">
                                        明細 #{lineItem.line.id}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {getProductName(lineItem.line)}
                                      </span>
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
                                        productName={getProductName(lineItem.line)}
                                        deliveryPlaceName={getDeliveryPlaceName(
                                          lineItem.order,
                                          lineItem.line,
                                        )}
                                        getLineAllocations={getLineAllocations}
                                        onLotAllocationChange={onLotAllocationChange}
                                        onAutoAllocate={onAutoAllocate}
                                        onClearAllocations={onClearAllocations}
                                        onSaveAllocations={onSaveAllocations}
                                        lineStatus={lineStatuses[lineItem.id] || "clean"}
                                        isOverAllocated={isOverAllocated(lineItem.id)}
                                        isActive={activeLineId === lineItem.id}
                                        onActivate={() => setActiveLineId(lineItem.id)}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
