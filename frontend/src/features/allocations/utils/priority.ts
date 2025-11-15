/**
 * Utility functions for priority calculation and color mapping
 */

import type { Order, OrderCardData, OrderLine, PriorityLevel } from "../types";

const sanitizeDateValue = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "―") {
    return null;
  }
  return trimmed;
};

const sumUnallocatedQuantity = (lines: OrderLine[] | undefined): number => {
  return (lines ?? []).reduce((sum: number, line) => {
    const allocated =
      line.allocated_lots?.reduce((acc: number, alloc) => {
        // DDL v2.2: prefer allocated_quantity, fallback to allocated_qty
        const qty =
          typeof alloc === "object" && alloc !== null
            ? Number(
                (
                  alloc as {
                    allocated_quantity?: number | string | null;
                    allocated_qty?: number | null;
                  }
                ).allocated_quantity ??
                  (
                    alloc as {
                      allocated_quantity?: number | string | null;
                      allocated_qty?: number | null;
                    }
                  ).allocated_qty ??
                  0,
              )
            : 0;
        return acc + qty;
      }, 0) ?? 0;
    // DDL v2.2: prefer order_quantity, fallback to quantity
    const quantity = Number(line.order_quantity ?? line.quantity ?? 0);
    return sum + (quantity - allocated);
  }, 0);
};

const computeDaysUntilDue = (
  orderDueDate?: string | null,
  lineDueDate?: string | null,
): number | null => {
  const dueDateSource = sanitizeDateValue(orderDueDate) ?? sanitizeDateValue(lineDueDate);
  if (!dueDateSource) {
    return null;
  }

  const dueDate = new Date(dueDateSource);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isNaN(diffDays) ? null : diffDays;
};

const hasMissingRequiredFields = (
  lines: OrderLine[] | undefined,
  hasLineData: boolean,
): boolean => {
  if (!hasLineData) return false;
  const safeLines = lines ?? [];
  if (safeLines.length === 0) return true;
  return safeLines.every((line) => {
    // DDL v2.2: prefer product_id, fallback to product_code
    const hasProduct = line.product_id || line.product_code;
    // DDL v2.2: prefer order_quantity, fallback to quantity
    const qty = Number(line.order_quantity ?? line.quantity ?? 0);
    return !hasProduct || qty === 0;
  });
};

const computeTotalOrderQuantity = (lines: OrderLine[] | undefined): number => {
  return (lines ?? []).reduce((sum, line) => {
    // DDL v2.2: prefer order_quantity, fallback to quantity
    const qty = Number(line.order_quantity ?? line.quantity ?? 0);
    return sum + qty;
  }, 0);
};

const resolvePrimaryDeliveryPlace = (order: Order, primaryLine?: OrderLine): string | null => {
  return (
    order.delivery_place_name ??
    order.delivery_place ??
    order.delivery_place_code ??
    primaryLine?.delivery_place_name ??
    primaryLine?.delivery_place_code ??
    order.ship_to ??
    null
  );
};

const normalizeLines = (lines: Order["lines"]): { items: OrderLine[]; hasLineData: boolean } => {
  if (Array.isArray(lines)) {
    return { items: lines, hasLineData: true };
  }
  return { items: [], hasLineData: false };
};

const resolveDueDateValue = (order: Order, primaryLine?: OrderLine): string | null => {
  // DDL v2.2: prefer delivery_date, fallback to due_date
  return (
    sanitizeDateValue(order.due_date) ??
    sanitizeDateValue(primaryLine?.delivery_date ?? primaryLine?.due_date ?? null)
  );
};

const buildOrderCardMetrics = (
  order: Order,
  lines: OrderLine[],
  hasLineData: boolean,
): {
  primaryLine: OrderLine | undefined;
  unallocatedQty: number;
  daysTodue: number | null;
  hasMissingFields: boolean;
  totalQuantity: number;
  primaryDeliveryPlace: string | null;
  normalizedDueDate: string | null;
} => {
  const primaryLine = lines[0];

  return {
    primaryLine,
    unallocatedQty: sumUnallocatedQuantity(lines),
    daysTodue: computeDaysUntilDue(
      order.due_date ?? null,
      primaryLine?.delivery_date ?? primaryLine?.due_date ?? null,
    ),
    hasMissingFields: hasMissingRequiredFields(lines, hasLineData),
    totalQuantity: computeTotalOrderQuantity(lines),
    primaryDeliveryPlace: resolvePrimaryDeliveryPlace(order, primaryLine),
    normalizedDueDate: resolveDueDateValue(order, primaryLine),
  };
};

/**
 * 優先度レベルを計算
 */
export function calculatePriority(order: Order): PriorityLevel {
  // 発注待ちステータス
  if (order.status === "PENDING_PROCUREMENT") {
    return "inactive";
  }

  // 完了・出荷済みステータス
  if (order.status === "closed" || order.status === "shipped") {
    return "inactive";
  }

  // 未引当数量の計算(allocated_lotsを使用)
  const unallocatedQty = sumUnallocatedQuantity(order.lines);

  // 引当済み(未引当なし)
  if (unallocatedQty <= 0) {
    return "allocated";
  }

  // 納期までの日数を計算
  const daysTodue = computeDaysUntilDue(order.due_date ?? null, null);

  if (daysTodue == null) {
    return "attention"; // 納期未設定の場合は注意レベル
  }

  // 優先度判定
  if (daysTodue < 0) {
    return "urgent"; // 納期遅延
  } else if (daysTodue <= 1) {
    return "urgent"; // 緊急(D-1以内)
  } else if (daysTodue <= 3) {
    return "warning"; // 要対応(D-3以内)
  } else if (daysTodue <= 7) {
    return "attention"; // 注意(D-7以内)
  }

  return "allocated"; // それ以外
}

/**
 * 受注カードデータを作成
 */
export function createOrderCardData(order: Order): OrderCardData {
  const { items: lines, hasLineData } = normalizeLines(order.lines);
  const priority = calculatePriority(order);
  const {
    primaryLine,
    unallocatedQty,
    daysTodue,
    hasMissingFields,
    totalQuantity,
    primaryDeliveryPlace,
    normalizedDueDate,
  } = buildOrderCardMetrics(order, lines, hasLineData);

  return {
    ...order,
    due_date: normalizedDueDate,
    total_quantity: order.total_quantity ?? totalQuantity,
    delivery_place_name: order.delivery_place_name ?? primaryLine?.delivery_place_name ?? null,
    delivery_place_code: order.delivery_place_code ?? primaryLine?.delivery_place_code ?? null,
    priority,
    unallocatedQty,
    daysTodue,
    hasMissingFields,
    totalQuantity,
    primaryDeliveryPlace,
  };
}

/**
 * 優先度カラーを取得
 */
export function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "warning":
      return "bg-orange-500";
    case "attention":
      return "bg-yellow-500";
    case "allocated":
      return "bg-blue-500";
    case "inactive":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

/**
 * 優先度バッジテキストカラーを取得
 */
export function getBadgeColor(priority: PriorityLevel): string {
  switch (priority) {
    case "urgent":
      return "text-red-700 bg-red-100 border-red-300";
    case "warning":
      return "text-orange-700 bg-orange-100 border-orange-300";
    case "attention":
      return "text-yellow-700 bg-yellow-100 border-yellow-300";
    case "allocated":
      return "text-blue-700 bg-blue-100 border-blue-300";
    case "inactive":
      return "text-gray-700 bg-gray-100 border-gray-300";
    default:
      return "text-gray-700 bg-gray-100 border-gray-300";
  }
}
