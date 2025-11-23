import type { LineStatus } from "../../hooks/useLotAllocation";
import { AllocationRowContainer } from "../lots/AllocationRowContainer";
import * as styles from "./FlatAllocationList.styles";

// フックのパスは環境に合わせて調整してください
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowUp, ArrowDown, CheckCircle, Calendar, Building2, Filter, X } from "lucide-react";
import type { CandidateLotItem } from "../../api";
import { getOrderQuantity } from "../../hooks/useLotAllocation/allocationFieldHelpers";

// --- Main Component ---

interface FlatAllocationListProps {
  orders: OrderWithLinesResponse[];
  customerMap?: Record<number, string>;
  productMap?: Record<number, string>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;
  isLoading?: boolean;

  // 新規追加
  lineStatuses: Record<number, LineStatus>;
  isOverAllocated: (lineId: number) => boolean;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
}

type FilterStatus = "all" | "complete" | "shortage" | "over" | "unallocated" | "no-candidates";

export function FlatAllocationList({
  orders,
  customerMap = {},
  productMap = {},
  getLineAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  isLoading = false,
  lineStatuses,
  isOverAllocated,
  getCandidateLots,
}: FlatAllocationListProps) {
  // チェック済みセクションへの参照
  const checkedSectionRef = useRef<HTMLDivElement>(null);
  // 未チェックセクションへの参照
  const uncheckedSectionRef = useRef<HTMLDivElement>(null);

  // チェック済みセクションへスクロール
  const scrollToCheckedSection = () => {
    checkedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // 未チェックセクションへスクロール（ページトップ）
  const scrollToUncheckedSection = () => {
    uncheckedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ★追加: 現在アクティブな行IDを管理するステート
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  // ★追加: チェックボックス選択状態を管理
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  // ★追加: フィルタステータス
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // 全行を選択
  const handleSelectAll = () => {
    const allLineIds = new Set<number>();
    orders.forEach((order) => {
      order.lines?.forEach((line) => {
        if (line.id) allLineIds.add(line.id);
      });
    });
    setSelectedLineIds(allLineIds);
  };

  // 全選択解除
  const handleDeselectAll = () => {
    setSelectedLineIds(new Set());
  };

  // 選択した行を一括保存
  const handleBulkSave = () => {
    selectedLineIds.forEach((lineId) => {
      onSaveAllocations(lineId);
    });
  };

  const getCustomerName = (order: OrderWithLinesResponse) => {
    if (order.customer_id) {
      return customerMap[order.customer_id] || order.customer_name || "顧客未設定";
    }
    return order.customer_name || "顧客未設定";
  };

  const getProductName = (line: any) => {
    if (line.product_id) {
      return productMap[line.product_id] || line.product_name || "商品名不明";
    }
    return line.product_name || "商品名不明";
  };

  if (isLoading) return <div className={styles.loadingMessage}>データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className={styles.emptyMessage}>表示対象の受注がありません</div>;

  // 受注が完全にチェックされているか判定
  const isOrderFullyChecked = (order: OrderWithLinesResponse) => {
    if (!order.lines || order.lines.length === 0) return false;
    return order.lines.every((line) => line.id && selectedLineIds.has(line.id));
  };

  // フィルタリング適用
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === "all") return true;
    if (!order.lines) return false;

    return order.lines.some((line) => {
      if (!line.id) return false;

      const allocations = getLineAllocations(line.id);
      const totalAllocated = Object.values(allocations).reduce((sum, qty) => sum + qty, 0);
      const required = getOrderQuantity(line);
      const remaining = required - totalAllocated;
      const candidates = getCandidateLots(line.id);
      const hasCandidates = candidates.length > 0;
      const isOver = isOverAllocated(line.id);

      switch (filterStatus) {
        case "complete":
          return remaining === 0 && !isOver;
        case "shortage":
          return remaining > 0 && hasCandidates;
        case "over":
          return isOver;
        case "unallocated":
          return totalAllocated === 0 && hasCandidates;
        case "no-candidates":
          return !hasCandidates;
        default:
          return true;
      }
    });
  });

  // チェック状態でソート（チェック済みを下に）
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aChecked = isOrderFullyChecked(a);
    const bChecked = isOrderFullyChecked(b);
    if (aChecked === bChecked) return 0;
    return aChecked ? 1 : -1; // チェック済みを後ろに
  });

  // チェック済みセクションの開始位置を検出
  const firstCheckedIndex = sortedOrders.findIndex(isOrderFullyChecked);

  return (
    <div className={styles.listContainer}>
      {/* 一括操作ヘッダー */}
      {orders.length > 0 && orders.some((o) => o.lines && o.lines.length > 0) && (
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

      {/* フィルタリングバー */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 pr-4 text-sm font-bold text-gray-600">
          <Filter className="h-4 w-4" />
          <span>フィルタ:</span>
        </div>

        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
          className={cn("h-7 rounded-full text-xs", filterStatus === "all" && "bg-gray-800")}
        >
          すべて
        </Button>

        <Button
          variant={filterStatus === "complete" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("complete")}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === "complete"
              ? "bg-blue-600 hover:bg-blue-700"
              : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700",
          )}
        >
          引当完了
        </Button>

        <Button
          variant={filterStatus === "shortage" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("shortage")}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === "shortage"
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "border-yellow-200 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700",
          )}
        >
          在庫不足
        </Button>

        <Button
          variant={filterStatus === "over" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("over")}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === "over"
              ? "bg-orange-500 hover:bg-orange-600"
              : "border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700",
          )}
        >
          在庫過剰
        </Button>

        <Button
          variant={filterStatus === "unallocated" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("unallocated")}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === "unallocated"
              ? "bg-gray-500 hover:bg-gray-600"
              : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700",
          )}
        >
          未引当
        </Button>

        <Button
          variant={filterStatus === "no-candidates" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("no-candidates")}
          className={cn(
            "h-7 rounded-full text-xs",
            filterStatus === "no-candidates"
              ? "bg-red-600 hover:bg-red-700"
              : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700",
          )}
        >
          候補なし
        </Button>

        {filterStatus !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterStatus("all")}
            className="ml-auto h-7 text-xs text-gray-500"
          >
            <X className="mr-1 h-3 w-3" />
            クリア
          </Button>
        )}
      </div>

      {/* ジャンプボタン */}
      <AnimatePresence>
        {firstCheckedIndex > 0 && (
          <div className="fixed right-8 bottom-8 z-50 flex flex-col gap-3">
            {/* 上へ戻るボタン */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                onClick={scrollToUncheckedSection}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-blue-700"
                title="未チェックセクションへ（トップへ戻る）"
              >
                <ArrowUp className="h-6 w-6 stroke-[3] text-white" />
                <span className="text-[10px] font-bold text-white">TOP</span>
              </Button>
            </motion.div>

            {/* 下へジャンプボタン */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
            >
              <Button
                onClick={scrollToCheckedSection}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-green-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-green-700"
                title={`チェック済みセクションへ (${sortedOrders.length - firstCheckedIndex}件)`}
              >
                <ArrowDown className="h-6 w-6 stroke-[3] text-white" />
                <span className="text-[10px] font-bold text-white">CHK</span>
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 受注ごとにループし、Order Cardとして表示 */}
      <AnimatePresence mode="popLayout">
        {sortedOrders.map((order, orderIndex) => {
          if (!order.lines || order.lines.length === 0) return null;

          const isChecked = isOrderFullyChecked(order);
          const isFirstChecked = orderIndex === firstCheckedIndex && firstCheckedIndex > 0;
          const isFirstUnchecked = orderIndex === 0;

          const customerName = getCustomerName(order);

          return (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                layout: { duration: 0.8, ease: "easeInOut" },
                opacity: { duration: 0.6 },
              }}
            >
              {/* 未チェックセクションの開始マーカー */}
              {isFirstUnchecked && <div ref={uncheckedSectionRef} className="absolute -top-20" />}

              {/* チェック済みセクションの区切り */}
              {isFirstChecked && (
                <div ref={checkedSectionRef} className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 shadow-sm">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-bold text-green-700">
                      チェック済み ({sortedOrders.length - firstCheckedIndex}件)
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                </div>
              )}

              <div
                className={cn(
                  "group/order mb-6 overflow-hidden rounded-xl border transition-all duration-300",
                  isChecked
                    ? "border-green-200 bg-green-50/50 shadow-sm hover:shadow-md"
                    : "border-gray-200 bg-white shadow-md hover:scale-[1.01] hover:shadow-2xl",
                )}
              >
                {/* Order Header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-6 py-3",
                    isChecked
                      ? "border-none bg-green-50/80"
                      : "border-b border-gray-200 bg-gray-50",
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* チェックボックス: 受注番号の左側 */}
                    <div className="flex shrink-0 items-center">
                      <input
                        type="checkbox"
                        checked={
                          order.lines?.every((line) => line.id && selectedLineIds.has(line.id)) ??
                          false
                        }
                        onChange={() => {
                          const allLineIds =
                            order.lines
                              ?.map((l) => l.id)
                              .filter((id): id is number => id !== undefined) ?? [];
                          const allSelected = allLineIds.every((id) => selectedLineIds.has(id));
                          setSelectedLineIds((prev) => {
                            const newSet = new Set(prev);
                            if (allSelected) {
                              allLineIds.forEach((id) => newSet.delete(id));
                            } else {
                              allLineIds.forEach((id) => newSet.add(id));
                            }
                            return newSet;
                          });
                        }}
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-gray-500">ORDER</span>
                      <span className="font-mono text-lg font-bold text-gray-900">
                        {order.order_number}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-gray-300" />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-bold text-gray-800">{customerName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="ml-1">受注日: {order.order_date}</span>
                    </div>
                    {isChecked && (
                      <div className="flex items-center gap-2 rounded-full bg-green-200 px-3 py-1">
                        <CheckCircle className="h-4 w-4 text-green-700" />
                        <span className="text-xs font-bold text-green-700">完了</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lines List - チェック済みの場合は非表示 */}
                {!isChecked && (
                  <div className="space-y-4 bg-gray-50/30 p-6">
                    {order.lines.map((line) => {
                      if (!line.id) return null;

                      const productName = getProductName(line);

                      return (
                        <div key={line.id} className="pl-4">
                          <AllocationRowContainer
                            order={order}
                            line={line}
                            customerName={customerName}
                            productName={productName}
                            getLineAllocations={getLineAllocations}
                            onLotAllocationChange={onLotAllocationChange}
                            onAutoAllocate={onAutoAllocate}
                            onClearAllocations={onClearAllocations}
                            onSaveAllocations={onSaveAllocations}
                            lineStatus={lineStatuses[line.id] || "clean"}
                            isOverAllocated={isOverAllocated(line.id)}
                            isActive={activeLineId === line.id}
                            onActivate={() => setActiveLineId(line.id)}
                          />
                        </div>
                      );
                    })}
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
