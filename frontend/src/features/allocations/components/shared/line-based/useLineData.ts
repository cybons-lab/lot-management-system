import { useMemo } from "react";

import type { CandidateLotItem } from "../../../api";
import { getOrderQuantity } from "../../../hooks/useLotAllocation/allocationFieldHelpers";
import { getLineAllocationStatus } from "../FlatAllocationList";

import { getCustomerName } from "./helpers";
import type { FilterStatus, GroupedOrder, LineWithOrderInfo } from "./types";

import type { OrderWithLinesResponse } from "@/shared/types/aliases";

export function useLineData({
  orders,
  customerMap,
  filterStatus,
  selectedLineIds,
  getLineAllocations,
  getCandidateLots,
  isOverAllocated,
  viewMode,
}: {
  orders: OrderWithLinesResponse[];
  customerMap: Record<number, string>;
  filterStatus: FilterStatus;
  selectedLineIds: Set<number>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  isOverAllocated: (lineId: number) => boolean;
  viewMode: "line" | "order";
}) {
  // 1. 全明細をフラット化し、Order情報を付与
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
            customer_name: getCustomerName(order, customerMap),
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

  return {
    allFlatLines,
    sortedLines,
    groupedOrders,
    firstCheckedIndex,
  };
}
