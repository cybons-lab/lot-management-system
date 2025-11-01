// v2.0 API (backend/app/schemas/inventory.py)
export interface LotResponse {
  id: number;
  supplier_code: string;
  product_code: string;
  product_name?: string; // 4.1で追加
  lot_number: string;
  receipt_date: string; // YYYY-MM-DD
  mfg_date?: string;
  expiry_date?: string;
  warehouse_code?: string;
  current_stock?: number;
  created_at: string;
  updated_at?: string;
}

// v2.0 API (backend/app/schemas/inventory.py)
export interface LotCreate {
  supplier_code: string;
  product_code: string;
  lot_number: string;
  receipt_date: string; // YYYY-MM-DD
  mfg_date?: string;
  expiry_date?: string;
  warehouse_code?: string;
}

// v2.0 API (backend/app/schemas/masters.py)
export interface Product {
  product_code: string;
  product_name: string;
  internal_unit: string;
  requires_lot_number: number;
}

// v2.0 API (backend/app/schemas/masters.py)
export interface Supplier {
  supplier_code: string;
  supplier_name: string;
}

// v2.0 API (backend/app/schemas/masters.py)
export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
  is_active: number;
}

// v2.0 API (backend/app/schemas/admin.py)
export interface DashboardStatsResponse {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
}

// v2.0 API (backend/app/schemas/sales.py)
export interface OrderResponse {
  id: number;
  order_no: string;
  customer_code: string;
  order_date?: string; // YYYY-MM-DD
  status: string;
  sap_order_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderLineResponse {
  id: number;
  order_id: number;
  line_no: number;
  product_code: string;
  quantity: number;
  unit?: string;
  due_date?: string; // YYYY-MM-DD
  created_at: string;
  allocated_qty?: number; // 引当済数量 (GET /orders/{id} で付与)
}

export interface OrderWithLinesResponse extends OrderResponse {
  lines: OrderLineResponse[];
}
