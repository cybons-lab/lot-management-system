import type { components } from "@/types/api";

// src/types/aliases.ts
// ---- Core masters ----
export type Product = {
  product_code: string;
  product_name: string;
  packaging_qty?: number | string | null;
  packaging_unit?: string | null;
  internal_unit?: string | null;
  customer_part_no?: string | null;
  maker_part_no?: string | null;
  requires_lot_number?: boolean | null;
};
export type Supplier = {
  supplier_code: string;
  supplier_name: string;
  address?: string | null;
  contact_name?: string | null; // factoryで使う
};
export type Customer = {
  customer_code: string;
  customer_name?: string | null;
  address?: string | null;
};
export type Warehouse = {
  warehouse_code: string;  
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean | null;
};
export type OldWarehouse = Warehouse; // 旧名の受け皿

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
export type AllocatedLot = {
  lot_id: number;
  allocated_quantity: number | string | null; // DDL v2.2: DECIMAL(15,3)
  allocated_qty?: number | null; // Deprecated: use allocated_quantity
  allocation_id?: number; // UI参照あり
  delivery_place_code: string | null;
  delivery_place_name: string | null;
};
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
  product_id?: number | null;
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
};

type ApiOrderLine = components["schemas"]["OrderLineResponse"];

export type OrderLine = ApiOrderLine & {
  // Legacy fields for backward compatibility (will be removed)
  line_no?: number | null;
  product_code?: string | null;
  product_name?: string | null;
  quantity?: number | string | null; // Deprecated: use order_quantity
  due_date?: string | null; // Deprecated: use delivery_date
  allocated_qty?: number | string | null; // Deprecated: use allocated_quantity
  allocated_quantity?: number | string | null; // API may expose the canonical column name
  converted_quantity?: number | string | null; // Internal unit quantity (converted from external unit)
  allocated_lots?: AllocatedLot[];
  delivery_place_allocations?: Array<{ delivery_place_code: string; quantity: number }>;
  delivery_place?: string | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  forecast_qty?: number | null;
  forecast_version_no?: number | null;
  status?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
  supplier_name?: string | null;
  product_internal_unit?: string | null;
  product_external_unit?: string | null;
  product_qty_per_internal_unit?: number | null;
};

type ApiOrderWithLinesResponse = components["schemas"]["OrderWithLinesResponse"];
type ApiOrderResponse = Omit<ApiOrderWithLinesResponse, "lines">;

export type OrderResponse = Omit<ApiOrderResponse, "lines"> & {
  // Legacy fields for backward compatibility (will be removed)
  order_no?: string | null; // Deprecated: use order_number
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
  lines?: OrderLine[];
};

export type OrderWithLinesResponse = Omit<ApiOrderWithLinesResponse, "lines"> & {
  // Legacy fields for backward compatibility (will be removed)
  order_no?: string | null; // Deprecated: use order_number
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
  productId?: number | null; // product_id基準の引当に必要
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
  date_from?: string | null;
  date_to?: string | null;
  unallocatedOnly?: boolean | null;
};
