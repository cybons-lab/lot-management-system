import { useMemo, useState, useRef } from "react";
import { cn } from "../../../../shared/libs/utils";
import { Button } from "../../../../components/ui";
import { Filter, ArrowUp, ArrowDown, CheckCircle, Calendar, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { getLineAllocationStatus } from "./FlatAllocationList"; // reuse helper
import { getOrderQuantity } from "../../hooks/useLotAllocation/allocationFieldHelpers";
import type { CandidateLotItem } from "../../api";
import { AllocationRowContainer } from "../lots/AllocationRowContainer";

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

  // スクロール用ref
  const checkedSectionRef = useRef<HTMLDivElement>(null);
  const uncheckedSectionRef = useRef<HTMLDivElement>(null);

  const scrollToCheckedSection = () => {
    checkedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToUncheckedSection = () => {
    uncheckedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ヘルパー: 顧客名取得
  const getCustomerName = (order: OrderWithLinesResponse) => {
    if (order.customer_id) {
      return customerMap[order.customer_id] || order.customer_name || "顧客未設定";
    }
    return order.customer_name || "顧客未設定";
  };

  // ヘルパー: 商品名取得
  const getProductName = (line: any) => {
    if (line.product_name) return line.product_name;
    if (line.product_id && productMap[line.product_id]) return productMap[line.product_id];
    return "商品名不明";
  };

  // ヘルパー: 納入先名取得
  const getDeliveryPlaceName = (order: OrderWithLinesResponse, line: any) => {
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
    line: any;
    order: OrderWithLinesResponse;
    order_number: string;
    customer_name: string;
    order_date: any;
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
            order_number: order.order_number || order.order_no || `#${order.id}`,
            customer_name: getCustomerName(order),
            order_date: order.order_date,
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
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-20">
      {/* 一括操作ヘッダー */}
      {allFlatLines.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700">一括操作:</span>
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{selectedLineIds.size} 件選択中</span>
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
      <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-2 pr-4 text-sm font-bold text-gray-600">
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
      </div>

      {/* ジャンプボタン */}
      <AnimatePresence>
        {firstCheckedIndex > 0 && (
          <div className="fixed right-8 bottom-8 z-50 flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                onClick={scrollToUncheckedSection}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-blue-700"
                title="未チェックセクションへ"
              >
                <ArrowUp className="h-6 w-6 stroke-[3] text-white" />
                <span className="text-[10px] font-bold text-white">TOP</span>
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
            >
              <Button
                onClick={scrollToCheckedSection}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-green-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-green-700"
                title="チェック済みセクションへ"
              >
                <ArrowDown className="h-6 w-6 stroke-[3] text-white" />
                <span className="text-[10px] font-bold text-white">CHK</span>
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 明細リスト表示 */}
      <AnimatePresence mode="popLayout">
        {sortedLines.map((item, index) => {
          const isChecked = selectedLineIds.has(item.id);
          const isFirstChecked = index === firstCheckedIndex && firstCheckedIndex > 0;
          const isFirstUnchecked = index === 0;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                layout: { duration: 0.8, ease: "easeInOut" },
                opacity: { duration: 0.6 },
              }}
            >
              {/* マーカー */}
              {isFirstUnchecked && <div ref={uncheckedSectionRef} className="absolute -top-20" />}
              {isFirstChecked && (
                <div ref={checkedSectionRef} className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-medium text-green-700 shadow-sm">
                    <CheckCircle className="h-3 w-3" />
                    <span>ここからチェック済み ({sortedLines.length - firstCheckedIndex}件)</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              {/* Order Card UI (Denormalized) */}
              <div
                className={cn(
                  "group/order mb-6 overflow-hidden rounded-xl border transition-all duration-300",
                  isChecked
                    ? "border-green-200 bg-green-50/50 shadow-sm hover:shadow-md"
                    : "border-gray-200 bg-white shadow-md hover:scale-[1.01] hover:shadow-2xl",
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-6 py-3",
                    isChecked
                      ? "border-none bg-green-50/80"
                      : "border-b border-gray-200 bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox for single line */}
                    <div className="flex shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedLineIds((prev) => {
                            const newSet = new Set(prev);
                            if (isChecked) newSet.delete(item.id);
                            else newSet.add(item.id);
                            return newSet;
                          });
                        }}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-gray-500">ORDER</span>
                      <span className="font-mono text-lg font-bold text-gray-900">
                        {item.order_number}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-gray-300" />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-bold text-gray-800">{item.customer_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="ml-1">受注日: {item.order_date}</span>
                    </div>
                    {isChecked && (
                      <div className="flex items-center gap-2 rounded-full bg-green-200 px-3 py-1">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                        <span className="text-xs font-bold text-green-700">完了</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Detail */}
                {!isChecked && (
                  <div className="bg-gray-50/30 p-6">
                    <AllocationRowContainer
                      order={item.order}
                      line={item.line}
                      customerName={item.customer_name}
                      productName={getProductName(item.line)}
                      deliveryPlaceName={getDeliveryPlaceName(item.order, item.line)}
                      getLineAllocations={getLineAllocations}
                      onLotAllocationChange={onLotAllocationChange}
                      onAutoAllocate={onAutoAllocate}
                      onClearAllocations={onClearAllocations}
                      onSaveAllocations={onSaveAllocations}
                      lineStatus={lineStatuses[item.id] || "clean"}
                      isOverAllocated={isOverAllocated(item.id)}
                      isActive={activeLineId === item.id}
                      onActivate={() => setActiveLineId(item.id)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
