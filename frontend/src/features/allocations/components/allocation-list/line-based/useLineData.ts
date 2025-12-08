import { useMemo } from "react";

import type { CandidateLotItem } from "../../../api";

import { shouldShowLine } from "./filterHelpers";
import { getCustomerName } from "./helpers";
import type { FilterStatus, GroupedOrder, LineWithOrderInfo } from "./types";

import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatOrderCode } from "@/shared/utils/order";

interface UseLineDataProps {
  orders: OrderWithLinesResponse[];
  customerMap: Record<number, string>;
  filterStatus: FilterStatus;
  selectedLineIds: Set<number>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  isOverAllocated: (lineId: number) => boolean;
  viewMode: "line" | "order";
}

export function useLineData({
  orders,
  customerMap,
  filterStatus,
  selectedLineIds,
  getLineAllocations,
  getCandidateLots,
  isOverAllocated,
  viewMode,
}: UseLineDataProps) {
  // 1. 全明細をフラット化し、Order情報を付与
  const allFlatLines: LineWithOrderInfo[] = useMemo(() => {
    return orders.flatMap((order) => {
      if (!order.lines) return [];
      return order.lines
        .map((line) => {
          if (!line.id) return null;
          const orderCode = formatOrderCode({ ...order, ...line, order_id: order.id });
          return {
            id: line.id,
            line: line,
            order: order,
            order_code: orderCode,
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
    return allFlatLines.filter((item) =>
      shouldShowLine({
        item,
        filterStatus,
        getLineAllocations,
        getCandidateLots,
        isOverAllocated,
      }),
    );
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
          order_code: item.order_code,
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
