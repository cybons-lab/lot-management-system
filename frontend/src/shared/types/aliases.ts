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

// ---- Inventory/Lot ----
export type LotResponse = {
  id: number;
  lot_number: string;
  product_code: string;
  product_name?: string | null;
  supplier_code: string;
  warehouse_code?: string | null;
  warehouse_id?: number | null;
  lot_unit?: string | null;
  receipt_date: string;
  mfg_date?: string | null;
  expiry_date?: string | null;
  current_quantity: number;
  last_updated?: string | null;
  created_at: string;
  updated_at?: string | null;
  // Backwards compatibility
  lot_no?: string | null;
  unit?: string | null;
  status?: string | null;
};
export type LotCreate = Partial<LotResponse>;
export type LotWithStock = LotResponse;

// ---- Allocation ----
export type AllocatedLot = {
  lot_id: number;
  allocated_qty: number | null;
  allocation_id?: number; // UI参照あり
  warehouse_code?: string | null;
  warehouse_name?: string | null;
};
export type LotCandidate = {
  id?: number;
  lot_id?: number;
  lot_code?: string;
  lot_number?: string;
  product_code: string;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
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

export type WarehouseAlloc = {
  qty: number;
  warehouse_id: number; // API保存時に必須に寄せる
  warehouse_code: string;
  warehouse_name?: string;
  lot_id: number;
  quantity: number;
};

export type LotAllocationRequest = {
  allocations: { lot_id: number; qty: number }[]; // API実シグネチャに合わせる
};
export type AllocationCancelRequest = {
  allocation_ids: number[];
};

// ---- Orders ----
export type OrderLine = {
  id: number;
  order_id?: number;
  line_no?: number;
  product_id?: number | null; // product_id基準の引当に必要
  product_code?: string | null; // Optional化（表示用のみ）
  product_name?: string;
  customer_code?: string;
  supplier_code?: string;
  quantity: number;
  unit: string;
  status?: string;
  due_date?: string | null;
  allocated_qty?: number | null;
  warehouse_allocations?: Array<{ warehouse_code: string; quantity: number }>;
  related_lots?: Array<Record<string, unknown>>;
  allocated_lots?: AllocatedLot[];
  next_div?: string | null;
  forecast_qty?: number | null;
  forecast_version_no?: number | null;
};
export type OrderResponse = {
  id: number;
  order_no: string;
  customer_code?: string | null;
  customer_name?: string | null;
  order_date: string;
  status: string;
  customer_order_no?: string | null;
  customer_order_no_last6?: string | null;
  delivery_mode?: string | null;
  sap_order_id?: string | null;
  sap_status?: string | null;
  sap_sent_at?: string | null;
  sap_error_msg?: string | null;
  created_at?: string;
  updated_at?: string | null;
  // Backwards compatibility
  due_date?: string | null;
  remarks?: string | null;
  lines?: OrderLine[];
};
export type OrderWithLinesResponse = OrderResponse;

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
  productCode?: string | null; // Optional化（表示用のみ）
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
  warehouses: string[];
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
  warehouse_code?: string | null;
  warehouse_name?: string | null;
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
