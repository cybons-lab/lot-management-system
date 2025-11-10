/**
 * normalize.ts
 *
 * API型からUI型への変換ユーティリティ
 * null/undefinedを安全な値に変換
 */

import type { components } from "@/types/api";
import type { OrderLine, OrderResponse as OrderResponseAlias } from "@/shared/types/aliases";

// ヘルパー関数
export const S = (v: string | null | undefined, fallback = "-"): string => v ?? fallback;
export const N = (v: number | null | undefined, fallback = 0): number => v ?? fallback;
export const D = (v: string | null | undefined, fallback = ""): string => v ?? fallback;

// API型のエイリアス
type OrderResponse = OrderResponseAlias;
type LotResponse = components["schemas"]["LotResponse"];
type ProductResponse = components["schemas"]["ProductResponse"];
type OrderLineOut = components["schemas"]["OrderLineOut"];

// UI用の型定義（すべてnon-nullable）
export interface OrderUI extends Record<string, unknown> {
  id: number;
  order_no: string;
  customer_code: string;
  customer_name: string;
  order_date: string;
  status: string;
  customer_order_no: string;
  customer_order_no_last6: string;
  delivery_mode: string;
  sap_order_id: string;
  sap_status: string;
  sap_sent_at: string;
  sap_error_msg: string;
  due_date: string;
  remarks: string;
  created_at: string;
  updated_at: string;
  lines?: OrderLine[];
}

export interface LotUI extends Record<string, unknown> {
  id: number;
  supplier_code: string;
  product_code: string;
  lot_number: string;
  receipt_date: string;
  mfg_date: string;
  expiry_date: string;
  warehouse_code: string;
  warehouse_id: number;
  lot_unit: string;
  kanban_class: string;
  sales_unit: string;
  inventory_unit: string;
  received_by: string;
  source_doc: string;
  qc_certificate_status: string;
  qc_certificate_file: string;
  current_quantity: number;
  last_updated: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductUI extends Record<string, unknown> {
  product_code: string;
  product_name: string;
  customer_part_no: string;
  maker_item_code: string;
  supplier_item_code: string;
  packaging_qty: string;
  packaging_unit: string;
  internal_unit: string;
  base_unit: string;
  assemble_div: string;
  next_div: string;
  ji_ku_text: string;
  kumitsuke_ku_text: string;
  shelf_life_days: number;
  requires_lot_number: number;
  delivery_place_id: number;
  delivery_place_name: string;
  shipping_warehouse_name: string;
}

export interface OrderLineUI extends Record<string, unknown> {
  id: number;
  line_no: number;
  product_code: string;
  product_name: string;
  customer_code: string;
  supplier_code: string;
  quantity: number;
  unit: string;
  due_date: string;
  warehouse_allocations: unknown[];
  related_lots: unknown[];
  allocated_lots: unknown[];
  allocated_qty: number;
  next_div: string;
}

/**
 * OrderResponse → OrderUI
 */
export function normalizeOrder(order: OrderResponse): OrderUI {
  return {
    id: order.id,
    order_no: S(order.order_no),
    customer_code: S(order.customer_code),
    customer_name: S(order.customer_name),
    order_date: S(order.order_date),
    status: S(order.status, "open"),
    customer_order_no: S(order.customer_order_no),
    customer_order_no_last6: S(order.customer_order_no_last6),
    delivery_mode: S(order.delivery_mode),
    sap_order_id: S(order.sap_order_id),
    sap_status: S(order.sap_status),
    sap_sent_at: S(order.sap_sent_at),
    sap_error_msg: S(order.sap_error_msg),
    due_date: S(order.due_date),
    remarks: S(order.remarks),
    created_at: S(order.created_at),
    updated_at: S(order.updated_at),
    lines: order.lines,
  };
}

/**
 * LotResponse → LotUI
 */
export function normalizeLot(lot: LotResponse): LotUI {
  return {
    id: lot.id,
    supplier_code: S(lot.supplier_code),
    product_code: S(lot.product_code),
    lot_number: S(lot.lot_number),
    receipt_date: S(lot.receipt_date),
    mfg_date: S(lot.mfg_date),
    expiry_date: S(lot.expiry_date),
    warehouse_code: S(lot.warehouse_code),
    warehouse_id: N(lot.warehouse_id),
    lot_unit: S(lot.lot_unit, "EA"),
    kanban_class: S(lot.kanban_class),
    sales_unit: S(lot.sales_unit),
    inventory_unit: S(lot.inventory_unit),
    received_by: S(lot.received_by),
    source_doc: S(lot.source_doc),
    qc_certificate_status: S(lot.qc_certificate_status),
    qc_certificate_file: S(lot.qc_certificate_file),
    current_quantity: N(lot.current_quantity),
    last_updated: S(lot.last_updated),
    product_name: S(lot.product_name),
    created_at: S(lot.created_at),
    updated_at: S(lot.updated_at),
  };
}

/**
 * ProductResponse → ProductUI
 */
export function normalizeProduct(product: ProductResponse): ProductUI {
  return {
    product_code: S(product.product_code),
    product_name: S(product.product_name),
    customer_part_no: S(product.customer_part_no),
    maker_item_code: S(product.maker_item_code),
    supplier_item_code: S(product.supplier_item_code),
    packaging_qty: S(product.packaging_qty),
    packaging_unit: S(product.packaging_unit),
    internal_unit: S(product.internal_unit),
    base_unit: S(product.base_unit, "EA"),
    assemble_div: S(product.assemble_div),
    next_div: S(product.next_div),
    ji_ku_text: S(product.ji_ku_text),
    kumitsuke_ku_text: S(product.kumitsuke_ku_text),
    shelf_life_days: N(product.shelf_life_days),
    requires_lot_number: N(product.requires_lot_number),
    delivery_place_id: N(product.delivery_place_id),
    delivery_place_name: S(product.delivery_place_name),
    shipping_warehouse_name: S(product.shipping_warehouse_name),
  };
}

/**
 * OrderLineOut → OrderLineUI
 */
export function normalizeOrderLine(line: OrderLineOut): OrderLineUI {
  return {
    id: line.id,
    line_no: N(line.line_no),
    product_code: S(line.product_code),
    product_name: S(line.product_name),
    customer_code: S(line.customer_code),
    supplier_code: S(line.supplier_code),
    quantity: N(line.quantity),
    unit: S(line.unit, "EA"),
    due_date: S(line.due_date),
    warehouse_allocations: line.warehouse_allocations ?? [],
    related_lots: line.related_lots ?? [],
    allocated_lots: line.allocated_lots ?? [],
    allocated_qty: N(line.allocated_qty),
    next_div: S(line.next_div),
  };
}
