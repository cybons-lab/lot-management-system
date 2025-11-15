/**
 * Type definitions for lot allocation feature
 */

import type { components } from "@/types/api";

export type OrderLine = components["schemas"]["OrderLineResponse"] & {
  // Legacy fields for backward compatibility
  line_no?: number | null;
  product_code?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  due_date?: string | null;
  allocated_qty?: number | string | null;
  allocated_lots?: unknown[];
  delivery_place_name?: string | null;
  delivery_place_code?: string | null;
};

export type PriorityLevel = "urgent" | "warning" | "attention" | "allocated" | "inactive";

export interface Order {
  id: number;
  order_number: string; // DDL v2.2
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
