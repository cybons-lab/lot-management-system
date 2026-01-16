/**
 * normalize.ts
 *
 * API型からUI型への変換ユーティリティ
 * null/undefinedを安全な値に変換し、UIで扱いやすい形式に正規化します。
 *
 * 【設計意図】正規化レイヤーの設計判断:
 *
 * 1. なぜAPI型とUI型を分離するのか
 *    理由: バックエンドとフロントエンドで型の扱いが異なる
 *    - バックエンド: null/undefined を許容（データベースのNULL）
 *    - フロントエンド: UIでは必ず表示する値が必要
 *    例:
 *    - API: customer_name: string | null
 *    - UI: customer_name: string（nullは "-" に変換）
 *
 * 2. S/N/D ヘルパー関数の役割
 *    S (String): 文字列のnull安全化
 *    - fallback="-": UIで「未設定」を明示的に表示
 *    N (Number): 数値のnull安全化
 *    - fallback=0: 計算に使う場合、0として扱う
 *    D (Date): 日付文字列のnull安全化
 *    - fallback="": 空文字として扱う（表示時にハイフンに変換）
 *
 * 3. ??（Nullish Coalescing）の使用
 *    理由: null/undefined のみをfallbackに置き換え
 *    → 0, false, "" は有効な値として扱う
 *    代替案: || を使うと、0や""もfallbackになってしまう
 *    例: S(0) → "0" (正しい), S(0) with || → "-" (誤り)
 *
 * 4. UI型の non-nullable 設計
 *    理由: React コンポーネントでnullチェック不要
 *    メリット:
 *    - {order.customer_name} と直接表示可能
 *    - order.customer_name?.trim() 等のオプショナルチェーン不要
 *    → コードがシンプルになる
 *
 * 5. Record<string, unknown> の継承
 *    理由: 将来的にフィールドが追加されても柔軟に対応
 *    → インデックスシグネチャで未知のプロパティも受け入れる
 *    例: UI側で独自に追加したプロパティ（computed values等）
 */

import type { AllocatedLot } from "@/shared/types/aliases";
import type {
  OrderLineResponse as OrderLine,
  OrderResponse as OrderResponseAlias,
} from "@/shared/types/schema";
import { formatOrderCode } from "@/shared/utils/order";
import type { components } from "@/types/api";

/**
 * 文字列のnull/undefinedを安全な値に変換
 * @param v - 変換対象の値
 * @param fallback - デフォルト値（デフォルト: "-"）
 * @returns 変換後の文字列
 */
export const S = (v: string | null | undefined, fallback = "-"): string => v ?? fallback;

/**
 * 数値のnull/undefinedを安全な値に変換
 * @param v - 変換対象の値
 * @param fallback - デフォルト値（デフォルト: 0）
 * @returns 変換後の数値
 */
export const N = (v: number | null | undefined, fallback = 0): number => v ?? fallback;

/**
 * 日付文字列のnull/undefinedを安全な値に変換
 * @param v - 変換対象の値
 * @param fallback - デフォルト値（デフォルト: ""）
 * @returns 変換後の日付文字列
 */
export const D = (v: string | null | undefined, fallback = ""): string => v ?? fallback;

// API型のエイリアス
type OrderResponse = OrderResponseAlias;
type LotResponse = components["schemas"]["LotResponse"] & {
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  // Phase 1 Fields (Manual extension until OpenAPI update)
  origin_type?: string | null;
  origin_reference?: string | null;
  shipping_date?: string | null;
  cost_price?: number | string | null;
  sales_price?: number | string | null;
  tax_rate?: number | string | null;
};
type ProductResponse = components["schemas"]["ProductOut"];

// Forward declare OrderLineUI for OrderUI
export interface OrderLineUI extends Record<string, unknown> {
  id: number;
  order_id: number;
  customer_order_no?: string | null;
  order_code: string;
  product_id: number;
  product_name: string; // Join field (not in DDL)
  order_quantity: string; // DDL v2.2: DECIMAL(15,3) as string
  unit: string;
  delivery_date: string; // DDL v2.2: changed from due_date
  delivery_place_id: number; // DDL v2.2: required field
  status: string; // Order line status
  created_at: string; // Creation timestamp
  updated_at: string; // Update timestamp
  allocated_quantity: string; // DDL v2.2: DECIMAL(15,3) as string
  warehouse_allocations: unknown[];
  related_lots: unknown[];
  allocated_lots: AllocatedLot[];
  // Legacy fields (deprecated, for backward compatibility)
  // DDL v2.2 additions
  order_type: string;
  project_code?: string;
  forecast_id?: number;
  product_code?: string;
  customer_code?: string;
  supplier_code?: string;
  quantity?: number | string;
  due_date?: string;
  allocated_qty?: number | string;
  next_div?: string;
}

// UI用の型定義（すべてnon-nullable）
export interface OrderUI extends Record<string, unknown> {
  id: number;
  order_code: string; // Display identifier (customer_order_no or #id)
  customer_id: number; // DDL v2.2: changed from customer_code
  customer_name: string; // Join field (not in DDL)
  order_date: string;
  status: string;
  remarks: string;
  created_at: string;
  updated_at: string;
  // Legacy fields (deprecated, for backward compatibility)
  order_no?: string;
  customer_code?: string;
  due_date?: string | null;
  lines?: OrderLineUI[];
}

export interface LotUI extends Record<string, unknown> {
  id: number; // Required for UI operations
  lot_id: number; // DDL v2.2
  lot_number: string;
  product_id: number; // DDL v2.2
  warehouse_id: number; // DDL v2.2
  supplier_id: number | null; // DDL v2.2
  received_date: string; // DDL v2.2
  expiry_date: string;
  current_quantity: string; // DDL v2.2: DECIMAL as string
  allocated_quantity: string; // DDL v2.2: DECIMAL as string
  locked_quantity?: string; // Optional: may not be present in all responses
  unit: string;
  status: "active" | "depleted" | "expired" | "quarantine" | "locked"; // Match API type
  lock_reason?: string | null; // Optional: only present when locked
  expected_lot_id: number | null; // DDL v2.2
  created_at: string;
  updated_at: string;

  // Inspection certificate fields
  inspection_status: string;
  inspection_date: string | null;
  inspection_cert_number: string | null;

  // User assignment fields
  primary_user_id?: number | null;
  primary_username?: string | null;
  primary_user_display_name?: string | null;

  // Low-level tracking
  origin_type: "adhoc" | "manual" | "migration" | "delivery_fulfillment";
  origin_reference: string | null;

  // Financials
  shipping_date: string | null;
  cost_price: string | null;
  sales_price: string | null;
  tax_rate: string | null;

  // Soft-delete status flags for related masters
  product_deleted?: boolean;
  warehouse_deleted?: boolean;
  supplier_deleted?: boolean;

  // Legacy fields (deprecated, for backward compatibility)
  product_code?: string | null;
  product_name?: string | null;
  supplier_name?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string;
  receipt_date?: string;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
}

export interface ProductUI extends Record<string, unknown> {
  id: number;
  product_code: string;
  product_name: string;
  internal_unit: string;
  external_unit: string;
  qty_per_internal_unit: number;
  customer_part_no: string | null;
  maker_item_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Legacy fields (deprecated, for backward compatibility)
  maker_part_code?: string;
  base_unit?: string;
  consumption_limit_days?: number;
  supplier_item_code?: string;
  packaging_qty?: string;
  packaging_unit?: string;
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

/**
 * OrderResponse → OrderUI
 */
export function normalizeOrder(order: OrderResponse): OrderUI {
  // Extract lines from order if they exist
  const rawLines = ((order as Record<string, unknown>).lines as OrderLine[] | undefined) ?? [];
  const normalizedLines = rawLines.map((line) => normalizeOrderLine(line));

  return {
    id: order.id,
    order_code: formatOrderCode(order),
    customer_id: N(order.customer_id),
    customer_name: S((order as Record<string, unknown>).customer_name as string),
    order_date: S(order.order_date),
    status: S((order as Record<string, unknown>).status as string, "pending"),
    remarks: S((order as Record<string, unknown>).remarks as string),
    created_at: S(order.created_at),
    updated_at: S(order.updated_at),
    // Legacy fields (for backward compatibility)
    order_no: S((order as Record<string, unknown>).order_no as string),
    customer_code: S((order as Record<string, unknown>).customer_code as string),
    due_date: ((order as Record<string, unknown>).due_date as string) ?? null,
    delivery_place: (order as Record<string, unknown>).delivery_place ?? null,
    delivery_place_code: (order as Record<string, unknown>).delivery_place_code ?? null,
    delivery_place_name: (order as Record<string, unknown>).delivery_place_name ?? null,
    total_quantity: ((order as Record<string, unknown>).total_quantity as number | null) ?? null,
    lines: normalizedLines,
  };
}

/**
 * LotResponse → LotUI
 */
export function normalizeLot(
  lot: Partial<LotResponse> & { lot_id: number; product_id: number; warehouse_id: number },
): LotUI {
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
    locked_quantity: lot.locked_quantity ?? undefined,
    unit: S(lot.unit, "EA"),
    status: (lot.status as "active" | "depleted" | "expired" | "quarantine" | "locked") ?? "active",
    lock_reason: lot.lock_reason ?? null,
    expected_lot_id: lot.expected_lot_id ?? null,
    created_at: S(lot.created_at),
    updated_at: S(lot.updated_at),

    // Inspection certificate fields
    inspection_status: lot.inspection_status ?? "not_required",
    inspection_date: lot.inspection_date ?? null,
    inspection_cert_number: lot.inspection_cert_number ?? null,

    // Phase 1 Fields
    origin_type:
      (lot.origin_type as "adhoc" | "manual" | "migration" | "delivery_fulfillment") ?? "adhoc",
    origin_reference: lot.origin_reference ?? null,
    shipping_date: lot.shipping_date ?? null,
    cost_price: lot.cost_price != null ? String(lot.cost_price) : null,
    sales_price: lot.sales_price != null ? String(lot.sales_price) : null,
    tax_rate: lot.tax_rate != null ? String(lot.tax_rate) : null,

    // Legacy fields (for backward compatibility)
    id: lot.lot_id,
    receipt_date: S(lot.received_date),
    delivery_place_id:
      ((lot as Record<string, unknown>).delivery_place_id as number | null) ?? null,
    delivery_place_code:
      ((lot as Record<string, unknown>).delivery_place_code as string | null) ?? null,
    product_name: lot.product_name,
    product_code: lot.product_code,
    supplier_name: lot.supplier_name,
    supplier_code: lot.supplier_code,
    warehouse_name: ((lot as Record<string, unknown>).warehouse_name as string | null) ?? null,
  };
}

/**
 * ProductResponse → ProductUI
 */
export function normalizeProduct(product: ProductResponse): ProductUI {
  return {
    id: product.id,
    product_code: S(product.product_code),
    product_name: S(product.product_name),
    internal_unit: S(product.internal_unit, "CAN"),
    external_unit: S(product.external_unit, "KG"),
    qty_per_internal_unit: N(product.qty_per_internal_unit, 1),
    customer_part_no: product.customer_part_no ?? null,
    maker_item_code: product.maker_item_code ?? null,
    is_active: product.is_active,
    created_at: S(product.created_at),
    updated_at: S(product.updated_at),
    // Legacy fields (for backward compatibility)
    maker_part_code: product.maker_item_code ?? undefined,
    base_unit: product.internal_unit,
    consumption_limit_days: undefined,
  };
}

/**
 * OrderLine → OrderLineUI
 */
export function normalizeOrderLine(line: OrderLine): OrderLineUI {
  return {
    id: line.id,
    order_id: N(line.order_id),
    customer_order_no: (line as Record<string, unknown>).customer_order_no as string | null,
    order_code: formatOrderCode(line),
    product_id: N(line.product_id),
    product_name: S(line.product_name),
    order_quantity: String(line.order_quantity ?? "0"),
    unit: S(line.unit, "EA"),
    delivery_date: S(line.delivery_date),
    delivery_place_id: N(line.delivery_place_id),
    status: S((line as Record<string, unknown>).status as string, "pending"),
    created_at: S(line.created_at),
    updated_at: S(line.updated_at),
    allocated_quantity: String(line.allocated_quantity ?? "0"),
    order_type: line.order_type ?? "ORDER",
    warehouse_allocations:
      ((line as Record<string, unknown>).warehouse_allocations as unknown[]) ?? [],
    related_lots: ((line as Record<string, unknown>).related_lots as unknown[]) ?? [],
    allocated_lots: ((line as Record<string, unknown>).allocated_lots as AllocatedLot[]) ?? [],
    // Legacy fields (for backward compatibility)
    line_no: ((line as Record<string, unknown>).line_no as number) ?? undefined,
    product_code: S((line as Record<string, unknown>).product_code as string),
    customer_code: S((line as Record<string, unknown>).customer_code as string),
    supplier_code: S((line as Record<string, unknown>).supplier_code as string | undefined),
    quantity:
      ((line as Record<string, unknown>).quantity as number | string) ?? line.order_quantity,
    due_date:
      ((line as Record<string, unknown>).due_date as string) ?? line.delivery_date ?? undefined,
    allocated_qty:
      ((line as Record<string, unknown>).allocated_qty as number | string) ?? undefined,
    next_div: S((line as Record<string, unknown>).next_div as string | undefined),
  };
}
