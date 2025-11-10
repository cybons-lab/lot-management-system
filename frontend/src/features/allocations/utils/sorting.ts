/**
 * Utility functions for sorting orders
 */

import type { OrderCardData, PriorityLevel } from "../types";

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  urgent: 0,
  warning: 1,
  attention: 2,
  allocated: 3,
  inactive: 4,
};

/**
 * Compare function for sorting order cards by priority, due date, and order date
 */
export function compareOrderCards(a: OrderCardData, b: OrderCardData): number {
  // Sort by priority first
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  // Then by days to due date
  if (a.daysTodue !== null && b.daysTodue !== null) {
    const dueDiff = a.daysTodue - b.daysTodue;
    if (dueDiff !== 0) return dueDiff;
  }

  // Finally by order date (newest first)
  return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
}

/**
 * Filter function for valid orders
 */
export function isValidOrder(order: OrderCardData): boolean {
  // Filter out orders with no lines
  if ((order.lines?.length ?? 0) === 0) return false;
  // Filter out orders with missing required fields
  if (order.hasMissingFields) return false;
  return true;
}
