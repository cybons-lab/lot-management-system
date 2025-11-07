/**
 * Type Definitions
 * アプリケーション全体で使用される型定義
 */

// ========================================
// ロット関連の型
// ========================================

export interface LotResponse {
  id: number;
  product_code: string;
  supplier_code: string;
  lot_number: string;
  receipt_date: string;
  expiry_date?: string | null;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
  current_quantity: number;
  last_updated?: string | null;
  product_name?: string | null;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface LotCreate {
  product_code: string;
  supplier_code: string;
  lot_number: string;
  receipt_date: string;
  expiry_date?: string | null;
  warehouse_code?: string | null;
  initial_quantity?: number;
}

// ========================================
// マスタデータの型
// ========================================

export interface Product {
  product_code: string;
  product_name: string;
  unit?: string;
  category?: string;
}

export interface Supplier {
  supplier_code: string;
  supplier_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
  address?: string;
  is_active: number;
}

// 後方互換性のためのエイリアス
export type OldWarehouse = Warehouse;

// ========================================
// 受注関連の型
// ========================================

export interface OrderResponse {
  id: number;
  order_number: string;
  order_date: string;
  customer_code: string;
  customer_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderLine {
  id: number;
  order_id: number;
  line_number: number;
  product_code: string;
  quantity: number;
  unit?: string;
  allocated_quantity?: number;
}

export interface OrderWithLinesResponse extends OrderResponse {
  lines: OrderLine[];
}

export interface OrdersListParams {
  skip?: number;
  limit?: number;
  status?: string;
  customer_code?: string;
}

// ========================================
// その他の型
// ========================================

export interface ApiError {
  detail: string;
  status: number;
}
