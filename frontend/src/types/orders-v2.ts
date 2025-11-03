// frontend/src/types/orders.ts (改善版)
// 受注・引当・倉庫配分の型定義

/**
 * 受注明細行
 */
export interface OrderLine {
  id: number;
  order_id: number;
  line_no: number;
  product_code: string;
  product_name?: string;
  quantity: number;
  unit: string;
  due_date?: string | null;
  ship_date?: string | null;
  planned_ship_date?: string | null;
  status?: string;
  customer_code?: string;
  order_date?: string;
  allocated_lots?: AllocatedLot[];
  /** 受注で指定された倉庫リスト */
  designated_warehouses?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * 引当済みロット
 */
export interface AllocatedLot {
  allocation_id: number;
  lot_id: number;
  lot_code: string;
  lot_number?: string;
  allocated_qty: number;
  warehouse_code: string;
  warehouse_name?: string;
  expiry_date?: string | null;
}

/**
 * 倉庫別配分
 */
export interface WarehouseAlloc {
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name?: string;
  lot_id: number;
  quantity: number;
  /** 後方互換用（quantity と同義） */
  qty?: number;
}

/**
 * ロット候補
 */
export interface LotCandidate {
  lot_id: number;
  lot_code: string;
  lot_number?: string;
  product_code: string;
  warehouse_code: string;
  available_qty: number;
  base_unit: string;
  lot_unit_qty?: number | null;
  lot_unit?: string | null;
  conversion_factor?: number | null;
  expiry_date?: string | null;
  receipt_date?: string;
}

/**
 * ロット引当リクエスト（倉庫指定対応）
 */
export interface LotAllocationRequest {
  allocations: {
    lot_id: number;
    qty: number;
  }[];
}

/**
 * ロット引当レスポンス
 */
export interface LotAllocationResponse {
  success: boolean;
  message: string;
  allocated_ids?: number[];
}

/**
 * 引当取消リクエスト
 */
export interface AllocationCancelRequest {
  order_line_id?: number;
  allocation_ids?: number[];
}

/**
 * 倉庫配分保存レスポンス
 */
export interface SaveAllocationsResponse {
  success: boolean;
  message: string;
}

/**
 * 受注一覧のフィルタパラメータ
 */
export interface OrdersListParams {
  skip?: number;
  limit?: number;
  customer_code?: string;
  status?: string;
  due_filter?: "all" | "has_due" | "no_due";
  sort_by?: "due_date" | "status" | "order_date";
  sort_order?: "asc" | "desc";
}

/**
 * 受注明細の計算済み情報
 */
export interface OrderLineComputed {
  ids: {
    lineId?: number;
    orderId?: number;
  };
  productCode?: string;
  productName?: string;
  totalQty: number;
  unit: string;
  allocatedTotal: number;
  remainingQty: number;
  progressPct: number;
  status?: string;
  customerCode?: string;
  orderDate?: string;
  dueDate?: string;
  shipDate?: string;
  plannedShipDate?: string;
  shippingLeadTime?: string | null;
  /** 受注で指定された倉庫リスト */
  warehouses: string[];
}

/**
 * フォーキャスト情報
 */
export interface ForecastData {
  product_code: string;
  month: string;
  forecasted_demand: number;
  actual_demand?: number;
  stock_level?: number;
}
