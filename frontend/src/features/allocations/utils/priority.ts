/**
 * Utility functions for priority calculation and color mapping
 */

import type { Order, OrderCardData, PriorityLevel } from "../types";

/**
 * 優先度レベルを計算
 */
export function calculatePriority(order: Order): PriorityLevel {
  const lines = order.lines || [];

  // 発注待ちステータス
  if (order.status === "PENDING_PROCUREMENT") {
    return "inactive";
  }

  // 完了・出荷済みステータス
  if (order.status === "closed" || order.status === "shipped") {
    return "inactive";
  }

  // 未引当数量の計算(allocated_lotsを使用)
  const unallocatedQty = lines.reduce((sum, line) => {
    const allocated =
      line.allocated_lots?.reduce((a, alloc) => a + (alloc.allocated_qty || 0), 0) || 0;
    return sum + (line.quantity - allocated);
  }, 0);

  // 引当済み(未引当なし)
  if (unallocatedQty <= 0) {
    return "allocated";
  }

  // 納期までの日数を計算
  if (!order.due_date) {
    return "attention"; // 納期未設定の場合は注意レベル
  }

  const dueDate = new Date(order.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const daysTodue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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
  const lines = order.lines || [];
  const priority = calculatePriority(order);

  // 未引当数量(allocated_lotsを使用)
  const unallocatedQty = lines.reduce((sum, line) => {
    const allocated =
      line.allocated_lots?.reduce((a, alloc) => a + (alloc.allocated_qty || 0), 0) || 0;
    return sum + (line.quantity - allocated);
  }, 0);

  // 納期までの日数
  let daysTodue: number | null = null;
  if (order.due_date) {
    const dueDate = new Date(order.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    daysTodue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 必須フィールド欠落チェック(緩和版: 明細に製品コードと数量があればOK)
  const hasMissingFields =
    lines.length === 0 || lines.every((l) => !l.product_code || !l.quantity || l.quantity === 0);

  return {
    ...order,
    priority,
    unallocatedQty,
    daysTodue,
    hasMissingFields,
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
