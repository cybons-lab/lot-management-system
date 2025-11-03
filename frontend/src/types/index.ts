// src/types/index.ts
// APIスキーマに基づき、フロントエンド全体で利用する型を再定義・整理

// --- 共通 ---
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// --- マスタ ---
export interface Product {
  product_code: string;
  product_name: string;
  internal_unit: string;
  requires_lot_number: number;
}

export interface Supplier {
  supplier_code: string;
  supplier_name: string;
}

// 既存の (古い) Warehouse
export interface OldWarehouse {
  warehouse_code: string;
  warehouse_name: string;
  is_active: number;
}

// --- 在庫 (Lot) ---
export interface LotResponse {
  id: number;
  supplier_code: string;
  product_code: string;
  product_name?: string;
  lot_number: string;
  receipt_date: string; // YYYY-MM-DD
  mfg_date?: string;
  expiry_date?: string;
  warehouse_code?: string;
  current_stock?: number;
  created_at: string;
  updated_at?: string;
}

export interface LotCreate {
  supplier_code: string;
  product_code: string;
  lot_number: string;
  receipt_date: string; // YYYY-MM-DD
  mfg_date?: string;
  expiry_date?: string;
  warehouse_code?: string;
}

// --- 受注 (Order) ---
export interface OrderResponse {
  id: number;
  order_no: string;
  customer_code: string;
  order_date?: string; // YYYY-MM-DD
  status: string;
  sap_order_id?: string;
  created_at: string;
  updated_at?: string;
  // 以下はフロントで独自に追加した可能性のあるフィールド
  due_date?: string | null;
  remarks?: string | null;
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
  allocated_qty?: number;
  // Forecast関連
  forecast_id?: number | null;
  forecast_granularity?: string | null;
  forecast_match_status?: string | null;
  forecast_qty?: number | null;
  forecast_version_no?: number | null;
  qty?: number;
  status?: string;
}

export interface OrderWithLinesResponse extends OrderResponse {
  lines: OrderLineResponse[];
}

export interface OrdersListParams {
  skip?: number;
  limit?: number;
  status?: string;
  customer_code?: string;
  date_from?: string;
  date_to?: string;
  due_filter?: DueFilter; // 納期フィルタ: 既定 'all'
}

// --- 管理 (Admin) ---
export interface DashboardStats {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
}

export interface ResetResponse {
  success: boolean;
  message: string;
  data?: any;
}

// --- 倉庫配分 (Warehouse Allocation) ---

// 1. 新しい倉庫マスタ (warehouse.id が主キーのもの)
export interface Warehouse {
  warehouse_code: string;
  warehouse_name: string;
}

export interface WarehouseListResponse {
  items: Warehouse[];
}

// 2. 倉庫配分の保存・表示用
export interface WarehouseAlloc {
  warehouse_code: string;
  quantity: number;
}

// 3. 配分情報付きの受注明細 (GET /orders-with-allocations のレスポンス)
export interface OrderLineWithAlloc {
  id: number;
  product_code: string;
  product_name: string;
  customer_code: string;
  supplier_code: string | null;
  quantity: number;
  unit: string;
  warehouse_allocations: WarehouseAlloc[];
  related_lots: LotCandidate[];
  allocated_lots: AllocatedLot[];

  // 追加フィールド（モック用）
  status?: string;
  order_date?: string;
  due_date?: string;
  order_no?: string;
  forecast_matched?: boolean;
  forecast_qty?: number;
}

export interface OrdersWithAllocResponse {
  items: OrderLineWithAlloc[];
}

// 4. 配分保存 (POST /orders/{id}/warehouse-allocations のリクエスト)
export interface SaveAllocationsRequest {
  allocations: WarehouseAlloc[];
}

export interface SaveAllocationsResponse {
  success: boolean;
  message: string;
}

// ===== ロット引当関連の型定義 =====

// 引当候補ロット情報
export interface LotCandidate {
  lot_id: number;
  lot_code: string;
  available_qty: number;
  unit: string;
  warehouse_code: string;
  expiry_date?: string;
  mfg_date?: string;
  stock_qty: number;
}

// 既引当ロット情報
export interface AllocatedLot {
  allocation_id: number;
  lot_id: number;
  lot_code: string;
  allocated_qty: number;
  warehouse_code: string;
  expiry_date?: string;
}

// UI用ロット選択状態
export interface LotSelection {
  lot_id: number;
  lot_code: string;
  available_qty: number;
  requested_qty: number;
  unit: string;
  warehouse_code: string;
  expiry_date?: string;
}

// --- Forecast一覧 (Forecast List) ---
export interface ForecastItemOut {
  id: number;
  product_code: string;
  product_name: string;
  client_code?: string;
  supplier_code?: string;
  granularity: string;
  version_no: string;
  updated_at: string; // ISO 8601 string
  daily_data?: { [day: string]: number };
  dekad_data?: { [dekad: string]: number };
  monthly_data?: { [month: string]: number };
  dekad_summary?: { [summary: string]: number };
  // フロント独自追加 (mock由来)
  client_name?: string;
  supplier_name?: string;
  unit?: string;
  version_history?: any[];
}

export interface ForecastListResponse {
  items: ForecastItemOut[];
}

export interface ForecastListParams {
  product_code?: string;
  supplier_code?: string;
}

// --- Forecastインポート (Forecast Import) ---
export interface ForecastBulkItem {
  product_code: string;
  client_code: string;
  granularity: "daily" | "dekad" | "monthly";
  date_day?: string;
  date_dekad_start?: string;
  year_month?: string;
  forecast_qty: number;
  version_no: number;
  version_issued_at: string; // ISO 8601 string
}

export interface ForecastBulkRequest {
  version_no: number;
  version_issued_at: string; // ISO 8601 string
  source_system?: string;
  deactivate_old_version?: boolean;
  forecasts: Omit<
    ForecastBulkItem,
    "version_no" | "version_issued_at" | "source_system" | "is_active"
  >[];
}

export interface ForecastBulkResponse {
  success: boolean;
  message: string;
  version_no: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  error_details?: string;
}

// --- 再マッチング (Re-match) ---
export interface ReMatchResponse extends OrderWithLinesResponse {
  // OrderWithLinesResponse と同じ
}
// --- Allocation: 引当リクエスト/レスポンス ---
export interface LotAllocationRequest {
  items: { lot_id: number; qty: number }[];
}
export interface LotAllocationResponse {
  success: boolean;
  message?: string;
  allocated?: { lot_id: number; qty: number }[];
}

// --- Allocation: 取消リクエスト/レスポンス（必要最小限） ---
export interface AllocationCancelRequest {
  all?: boolean;
  items?: { allocation_id?: number; lot_id?: number }[];
}
export interface AllocationCancelResponse {
  success: boolean;
  message?: string;
}

// --- 倉庫配分 ---
export interface WarehouseAlloc {
  warehouse_id: number;
  lot_id: number;
  qty: number;
}
export interface SaveAllocationsRequest {
  allocations: WarehouseAlloc[];
}
export type DueFilter = "all" | "has_due" | "no_due";
