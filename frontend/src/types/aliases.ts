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
  lot_no?: string | null;
  lot_number?: string;
  product_code: string;
  product_name?: string | null;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
  unit?: string | null;
  status?: string | null;
  receipt_date?: string | null;
  expiry_date?: string | null;
  current_quantity?: number | null;
  created_at: string;
  updated_at?: string | null;
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
  line_no?: number;
  product_code: string;
  quantity: number;
  unit?: string;
  status?: string;
  due_date?: string | null;
  allocated_qty?: number | null;
  forecast_qty?: number | null;
  forecast_version_no?: number | null;
  allocated_lots?: AllocatedLot[];
};
export type OrderResponse = {
  id: number;
  order_no: string;
  customer_code: string;
  customer_name?: string | null;
  order_date?: string | null;
  due_date?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string | null;
  sap_order_id?: string | null;
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
  productCode: string;
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
