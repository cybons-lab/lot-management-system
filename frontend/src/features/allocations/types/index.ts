/**
 * Type definitions for lot allocation feature
 */

import type { CandidateLotItem } from "../api";

import type { OrderLine as SharedOrderLine } from "@/shared/types/aliases";

export type OrderLine = SharedOrderLine;

export type PriorityLevel = "urgent" | "warning" | "attention" | "allocated" | "inactive";

export interface Order {
  id: number;
  order_code: string; // Display identifier derived from customer_order_no or id
  customer_order_no?: string | null;
  customer_id: number; // DDL v2.2
  delivery_place_id: number; // DDL v2.2
  order_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  order_no?: string;
  customer_code?: string | null;
  customer_name?: string;
  due_date?: string | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  delivery_place?: string | null;
  total_quantity?: number | null;
  ship_to?: string;
  lines?: OrderLine[];
}

export interface OrderCardData extends Order {
  priority: PriorityLevel;
  unallocatedQty: number;
  daysTodue: number | null;
  hasMissingFields: boolean;
  totalQuantity: number;
  primaryDeliveryPlace?: string | null;
}

export type WarehouseSummary = {
  key: string;
  warehouseId?: number;
  warehouseCode?: string | null;
  warehouseName?: string | null;
  totalStock: number;
};

// ===== Consolidated Types from useLotAllocation =====

/**
 * Allocations organized by line ID
 * Record<lineId, Record<lotId, quantity>>
 */
export type AllocationsByLine = Record<number, LineAllocations>;

/**
 * Allocations for a single line
 * Record<lotId, quantity>
 */
export type LineAllocations = Record<number, number>;

/**
 * Line status map
 * Record<lineId, LineStatus>
 */
export type LineStatusMap = Record<number, LineStatus>;

/**
 * Status of an allocation line
 * - clean: No pending changes
 * - draft: Has unsaved changes
 * - committed: Successfully saved
 */
export type LineStatus = "clean" | "draft" | "committed";

/**
 * Toast state for allocation operations
 */
export type AllocationToastState = { message: string; variant: "success" | "error" } | null;

/**
 * Stock status information for an order line
 */
export interface LineStockStatus {
  hasShortage: boolean;
  totalAvailable: number;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  totalAllocated: number;
  remainingQty: number;
  progress: number;
}

/**
 * Function type for fetching candidate lots from cache
 */
export interface CandidateLotFetcher {
  (lineId: number, productId: number): CandidateLotItem[];
}
