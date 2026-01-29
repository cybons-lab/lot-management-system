import type { OrderLineLegacy } from "./legacy/order-line-legacy";

import type { components } from "@/types/api";

/**
 * 型エイリアス定義
 *
 * このファイルは共通型定義とバックエンドAPIレスポンスの型エイリアスを提供します。
 */

// src/types/aliases.ts
// ---- Core masters ----

/**
 * 製品マスタ
 *
 * システムで管理される製品の基本情報を表現します。
 */
export type Product = {
  /** 製品コード */
  product_code: string;
  /** 製品名 */
  product_name: string;
  /** 梱包数量 */
  packaging_qty?: number | string | null;
  /** 梱包単位 */
  packaging_unit?: string | null;
  /** 社内単位 */
  internal_unit?: string | null;
  /** 得意先品番 */
  customer_part_no?: string | null;
  /** メーカー品番 */
  maker_part_no?: string | null;
  /** ロット番号必須フラグ */
  requires_lot_number?: boolean | null;
};

/**
 * サプライヤーマスタ
 *
 * 仕入先・供給元の情報を表現します。
 */
export type Supplier = {
  /** サプライヤーコード */
  supplier_code: string;
  /** サプライヤー名 */
  supplier_name: string;
  /** 住所 */
  address?: string | null;
  /** 担当者名（工場等で使用） */
  contact_name?: string | null;
};

/**
 * 顧客マスタ
 *
 * 得意先・顧客の情報を表現します。
 */
export type Customer = {
  /** 顧客コード */
  customer_code: string;
  /** 顧客名 */
  customer_name?: string | null;
  /** 住所 */
  address?: string | null;
};

/**
 * 倉庫マスタ
 *
 * 在庫保管場所としての倉庫情報を表現します。
 */
export type Warehouse = {
  /** 倉庫コード */
  warehouse_code: string;
  /** 倉庫名 */
  warehouse_name: string;
  /** 住所 */
  address?: string | null;
  /** 有効フラグ */
  is_active?: boolean | null;
};

/** 旧Warehouse型名の後方互換性エイリアス */
export type OldWarehouse = Warehouse;

type ApiLotResponse = components["schemas"]["LotResponse"];

// ---- Inventory/Lot ----
export type LotResponse = ApiLotResponse & {
  id: number; // lot_id alias (required for UI compatibility)
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  lot_no?: string | null;
  unit?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
};
export type LotCreate = Partial<LotResponse>;
export type LotWithStock = LotResponse;

// ---- Allocation ----
// AllocatedLot is imported from allocation-types.ts to avoid circular dependencies
// Re-export for backward compatibility
export type { AllocatedLot } from "./allocation-types";

export type LotCandidate = {
  id?: number;
  lot_id?: number;
  lot_code?: string;
  lot_number?: string;
  product_code: string | null;
  delivery_place_code: string | null;
  delivery_place_name: string | null;
  base_unit?: string | null;
  lot_unit?: string | null;
  lot_unit_qty?: number | null;
  conversion_factor?: number | null; // UI参照あり
  expiry_date?: string | null;
  receipt_date?: string | null;
  available_qty?: number | null;
  allocate_qty?: number | null;
};
export type LotCandidateResponse = { items: LotCandidate[]; warnings?: string[] };

// CandidateLotItem (バックエンドのCandidateLotItemスキーマに対応)
export type CandidateLotItem = {
  lot_id: number;
  lot_number: string;
  free_qty: number;
  current_quantity: number;
  allocated_quantity: number | string; // DDL v2.2: DECIMAL(15,3)
  allocated_qty?: number; // Deprecated: use allocated_quantity
  product_group_id?: number | null;
  product_code?: string | null;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  expiry_date?: string | null;
  last_updated?: string | null;
};

export type CandidateLotsResponse = {
  items: CandidateLotItem[];
  total: number;
};

export type DeliveryPlaceAlloc = {
  qty: number;
  delivery_place_id: number;
  delivery_place_code: string;
  delivery_place_name?: string;
  lot_id: number;
  quantity: number;
};

// Backwards compatibility alias
export type WarehouseAlloc = DeliveryPlaceAlloc;

export type LotAllocationRequest = {
  allocations: { lot_id: number; qty: number }[]; // API実シグネチャに合わせる
};
export type AllocationCancelRequest = {
  allocation_ids: number[];
};

// ---- Orders ----
/**
 * 注文ステータスEnum
 * バックエンドの OrderStatus Enum に対応
 */
export enum OrderStatus {
  DRAFT = "draft",
  OPEN = "open",
  PART_ALLOCATED = "part_allocated",
  ALLOCATED = "allocated",
  SHIPPED = "shipped",
  CLOSED = "closed",
  CANCELLED = "cancelled",
  ON_HOLD = "on_hold",
}

/**
 * ステータス表示用のラベルと色
 */
export const ORDER_STATUS_DISPLAY: Record<OrderStatus, { label: string; variant: string }> = {
  [OrderStatus.DRAFT]: { label: "下書き", variant: "bg-gray-100 text-gray-800" },
  [OrderStatus.OPEN]: { label: "未処理", variant: "bg-gray-100 text-gray-800" },
  [OrderStatus.PART_ALLOCATED]: {
    label: "部分引当",
    variant: "bg-blue-100 text-blue-800",
  },
  [OrderStatus.ALLOCATED]: { label: "引当済", variant: "bg-emerald-100 text-emerald-800" },
  [OrderStatus.SHIPPED]: { label: "出荷済", variant: "bg-green-100 text-green-800" },
  [OrderStatus.CLOSED]: { label: "完了", variant: "bg-gray-100 text-gray-800" },
  [OrderStatus.CANCELLED]: { label: "キャンセル", variant: "bg-red-100 text-red-800" },
  [OrderStatus.ON_HOLD]: { label: "保留中", variant: "bg-amber-100 text-amber-800" },
};

type ApiOrderLine = components["schemas"]["OrderLineResponse"];

export type OrderLine = ApiOrderLine &
  OrderLineLegacy & {
    // Canonical fields overrides or additions
    allocated_quantity?: number | string | null; // API may expose the canonical column name
    converted_quantity?: number | string | null; // Internal unit quantity (converted from external unit)

    // Flattened Order Info (New)
    customer_order_no?: string | null;
    order_code?: string;
    order_date?: string | null;
    customer_id?: number | null;
    order_status?: string | null;

    [key: string]: unknown; // Allow extra properties
  };

type ApiOrderWithLinesResponse = components["schemas"]["OrderWithLinesResponse"];
type ApiOrderResponse = Omit<ApiOrderWithLinesResponse, "lines">;

export type OrderResponse = Omit<ApiOrderResponse, "lines"> & {
  // Legacy fields for backward compatibility (will be removed)
  // order_no?: string | null; // Deprecated: use customer_order_no/order_code
  customer_code?: string | null; // Deprecated: use customer_id lookup
  customer_name?: string | null; // Join field (not in DDL)
  delivery_place?: string | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  total_quantity?: number | null;
  due_date?: string | null;
  remarks?: string | null;
  received_at?: string | null;
  sap_received_at?: string | null;
  received_date?: string | null;
  document_date?: string | null;
  status?: string | null; // Legacy field
  locked_by_user_id?: number | null; // Editor user ID (optimistic lock)
  locked_by_user_name?: string | null; // Editor display name
  locked_by?: string | null; // Fallback: some APIs may return a simple string
  locked_at?: string | null; // Locked timestamp (ISO)
  lines?: OrderLine[];
};

export type OrderWithLinesResponse = Omit<ApiOrderWithLinesResponse, "lines"> & {
  // Legacy fields for backward compatibility (will be removed)
  // order_no?: string | null; // Deprecated: use customer_order_no/order_code
  customer_code?: string | null; // Deprecated: use customer_id lookup
  customer_name?: string | null; // Join field (not in DDL)
  delivery_place?: string | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  total_quantity?: number | null;
  due_date?: string | null;
  remarks?: string | null;
  received_at?: string | null;
  sap_received_at?: string | null;
  received_date?: string | null;
  document_date?: string | null;
  status?: string | null; // Legacy field
  locked_by_user_id?: number | null; // Editor user ID (optimistic lock)
  locked_by_user_name?: string | null; // Editor display name
  locked_by?: string | null; // Fallback: some APIs may return a simple string
  locked_at?: string | null; // Locked timestamp (ISO)
  lines?: OrderLine[];
};

// ---- Computed (UI-only) ----
export type OrderLineComputed = {
  ids: {
    lineId?: number;
    orderId?: number;
  };
  lineId?: number;
  orderId?: number;
  id?: number;
  productId?: number | null; // product_group_id基準の引当に必要
  productCode?: string | null; // Optionalか(表示用のみ)
  productName: string;
  status?: string;
  orderDate?: string | null;
  dueDate?: string | null;
  shipDate?: string | null;
  plannedShipDate?: string | null;
  totalQty: number; // UI用に必須化
  unit: string; // null→"EA"などで埋める
  allocatedTotal: number; // UI計算値
  remainingQty: number; // UI計算値
  progressPct: number; // UI計算値
  customerCode?: string;
  customerName?: string;
  customerId?: number | null;
  deliveryPlaces: string[]; // warehouse → deliveryPlace に変更
  shippingLeadTime?: string; // 任意表示
};

export type OrderLineCreate = {
  id?: number;
  orderId?: number;
  line_number?: number;
  product_code: string;
  quantity: number;
  unit?: string;
  allocated_qty?: number;
};

export type FefoLotAllocation = {
  lot_id: number;
  lot_code?: string;
  lot_number?: string;
  product_code: string;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  base_unit?: string | null;
  lot_unit?: string | null;
  lot_unit_qty?: number | null;
  conversion_factor?: number | null;
  expiry_date?: string | null;
  receipt_date?: string | null;
  available_qty?: number | null;
};

export type getLotCandidates = {
  items: FefoLotAllocation[];
  warnings?: string[];
};

// ---- Query params ----
export type OrdersListParams = {
  skip?: number;
  limit?: number;
  status?: string | null;
  customer_code?: string | null;
  order_type?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  unallocatedOnly?: boolean | null;
};
