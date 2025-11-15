/**
 * normalize.ts
 *
 * API型からUI型への変換ユーティリティ
 * null/undefinedを安全な値に変換
 */

import type { OrderLine, OrderResponse as OrderResponseAlias } from "@/shared/types/aliases";
import type { components } from "@/types/api";

// ヘルパー関数
export const S = (v: string | null | undefined, fallback = "-"): string => v ?? fallback;
export const N = (v: number | null | undefined, fallback = 0): number => v ?? fallback;
export const D = (v: string | null | undefined, fallback = ""): string => v ?? fallback;

// API型のエイリアス
type OrderResponse = OrderResponseAlias;
type LotResponse = components["schemas"]["LotResponse"] & {
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
};
type ProductResponse = components["schemas"]["ProductResponse"];

// UI用の型定義（すべてnon-nullable）
export interface OrderUI extends Record<string, unknown> {
  id: number;
  order_number: string; // DDL v2.2: changed from order_no
  customer_id: number; // DDL v2.2: changed from customer_code
  customer_name: string; // Join field (not in DDL)
  order_date: string;
  status: string;
  delivery_place_id: number; // DDL v2.2: required field
  remarks: string;
  created_at: string;
  updated_at: string;
  // Legacy fields (deprecated, for backward compatibility)
  order_no?: string;
  customer_code?: string;
  due_date?: string | null;
  lines?: OrderLine[];
}

export interface LotUI extends Record<string, unknown> {
  lot_id: number; // DDL v2.2
  lot_number: string;
  product_id: number; // DDL v2.2
  warehouse_id: number; // DDL v2.2
  supplier_id: number | null; // DDL v2.2
  received_date: string; // DDL v2.2
  expiry_date: string;
  current_quantity: string; // DDL v2.2: DECIMAL as string
  allocated_quantity: string; // DDL v2.2: DECIMAL as string
  unit: string;
  status: string; // DDL v2.2: active/depleted/expired/quarantine
  expected_lot_id: number | null; // DDL v2.2
  created_at: string;
  updated_at: string;
  // Legacy fields (deprecated, for backward compatibility)
  id?: number;
  product_code?: string;
  supplier_code?: string;
  warehouse_code?: string;
  receipt_date?: string;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  product_name?: string;
}

export interface ProductUI extends Record<string, unknown> {
  id: number;
  maker_part_code: string; // DDL v2.2
  product_name: string;
  base_unit: string; // DDL v2.2
  consumption_limit_days: number; // DDL v2.2
  created_at: string;
  updated_at: string;
  // Legacy fields (deprecated, for backward compatibility)
  product_code?: string;
  customer_part_no?: string;
  maker_item_code?: string;
  supplier_item_code?: string;
  packaging_qty?: string;
  packaging_unit?: string;
  internal_unit?: string;
  assemble_div?: string;
  next_div?: string;
  ji_ku_text?: string;
  kumitsuke_ku_text?: string;
  shelf_life_days?: number;
  requires_lot_number?: number;
  delivery_place_id?: number;
  delivery_place_name?: string;
  shipping_warehouse_name?: string;
}

export interface OrderLineUI extends Record<string, unknown> {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string; // Join field (not in DDL)
  order_quantity: string; // DDL v2.2: DECIMAL(15,3) as string
  unit: string;
  delivery_date: string; // DDL v2.2: changed from due_date
  warehouse_allocations: unknown[];
  related_lots: unknown[];
  allocated_lots: unknown[];
  // Legacy fields (deprecated, for backward compatibility)
  line_no?: number;
  product_code?: string;
  customer_code?: string;
  supplier_code?: string;
  quantity?: number | string;
  due_date?: string;
  allocated_qty?: number | string;
  next_div?: string;
}

/**
 * OrderResponse → OrderUI
 */
export function normalizeOrder(order: OrderResponse): OrderUI {
  return {
    id: order.id,
    order_number: S(order.order_number),
    customer_id: N(order.customer_id),
    customer_name: S(order.customer_name),
    order_date: S(order.order_date),
    status: S(order.status, "pending"),
    delivery_place_id: N(order.delivery_place_id),
    remarks: S(order.remarks),
    created_at: S(order.created_at),
    updated_at: S(order.updated_at),
    // Legacy fields (for backward compatibility)
    order_no: S(order.order_no ?? order.order_number),
    customer_code: S(order.customer_code),
    due_date: order.due_date ?? null,
    delivery_place: (order as Record<string, unknown>).delivery_place ?? null,
    delivery_place_code: (order as Record<string, unknown>).delivery_place_code ?? null,
    delivery_place_name: (order as Record<string, unknown>).delivery_place_name ?? null,
    total_quantity: (order as Record<string, unknown>).total_quantity ?? null,
    lines: order.lines,
  };
}

/**
 * LotResponse → LotUI
 */
export function normalizeLot(lot: LotResponse): LotUI {
  return {
    lot_id: lot.lot_id,
    lot_number: S(lot.lot_number),
    product_id: lot.product_id,
    warehouse_id: lot.warehouse_id,
    supplier_id: lot.supplier_id ?? null,
    received_date: S(lot.received_date),
    expiry_date: S(lot.expiry_date),
    current_quantity: S(lot.current_quantity, "0"),
    allocated_quantity: S(lot.allocated_quantity, "0"),
    unit: S(lot.unit, "EA"),
    status: S(lot.status, "active"),
    expected_lot_id: lot.expected_lot_id ?? null,
    created_at: S(lot.created_at),
    updated_at: S(lot.updated_at),
    // Legacy fields (for backward compatibility)
    id: lot.lot_id,
    receipt_date: S(lot.received_date),
    delivery_place_id:
      ((lot as Record<string, unknown>).delivery_place_id as number | null) ?? null,
    delivery_place_code:
      ((lot as Record<string, unknown>).delivery_place_code as string | null) ?? null,
    product_name: (lot as Record<string, unknown>).product_name as string | undefined,
  };
}

/**
 * ProductResponse → ProductUI
 */
export function normalizeProduct(product: ProductResponse): ProductUI {
  return {
    id: product.id,
    maker_part_code: S(product.maker_part_code),
    product_name: S(product.product_name),
    base_unit: S(product.base_unit, "EA"),
    consumption_limit_days: N(product.consumption_limit_days),
    created_at: S(product.created_at),
    updated_at: S(product.updated_at),
    // Legacy fields (for backward compatibility)
    product_code: S(product.maker_part_code), // Use maker_part_code as product_code
  };
}

/**
 * OrderLine → OrderLineUI
 */
export function normalizeOrderLine(line: OrderLine): OrderLineUI {
  return {
    id: line.id,
    order_id: N(line.order_id),
    product_id: N(line.product_id),
    product_name: S(line.product_name),
    order_quantity: String(line.order_quantity ?? "0"),
    unit: S(line.unit, "EA"),
    delivery_date: S(line.delivery_date),
    warehouse_allocations:
      ((line as Record<string, unknown>).warehouse_allocations as unknown[]) ?? [],
    related_lots: ((line as Record<string, unknown>).related_lots as unknown[]) ?? [],
    allocated_lots: line.allocated_lots ?? [],
    // Legacy fields (for backward compatibility)
    line_no: line.line_no ?? undefined,
    product_code: S(line.product_code),
    customer_code: S(line.customer_code),
    supplier_code: S((line as Record<string, unknown>).supplier_code as string | undefined),
    quantity: line.quantity ?? line.order_quantity,
    due_date: line.due_date ?? line.delivery_date ?? undefined,
    allocated_qty: line.allocated_qty ?? undefined,
    next_div: S((line as Record<string, unknown>).next_div as string | undefined),
  };
}
