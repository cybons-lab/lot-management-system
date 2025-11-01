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

// (古いv1.0のShipment型は、v2.0では未実装のため一旦削除)
