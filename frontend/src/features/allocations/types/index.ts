/**
 * Type definitions for lot allocation feature
 */

import type { OrderLine as SharedOrderLine } from "@/shared/types/aliases";
import type { paths } from "@/types/api";

// ===== API Types (v2 compatible) =====

export type ManualAllocationRequest =
  paths["/api/v2/allocation/manual"]["post"]["requestBody"]["content"]["application/json"];
export type ManualAllocationResponse =
  paths["/api/v2/allocation/manual"]["post"]["responses"][200]["content"]["application/json"];

export interface ManualAllocationBatchResponse {
  success: boolean;
  created_count: number;
  message: string;
}

export type FefoPreviewRequest =
  paths["/api/v2/allocation/preview"]["post"]["requestBody"]["content"]["application/json"];
export type FefoPreviewResponse =
  paths["/api/v2/allocation/preview"]["post"]["responses"][200]["content"]["application/json"];

export type AllocationCommitRequest =
  paths["/api/v2/allocation/commit"]["post"]["requestBody"]["content"]["application/json"];
export type AllocationCommitResponse =
  paths["/api/v2/allocation/commit"]["post"]["responses"][200]["content"]["application/json"];

// Alias for compatibility
export interface CandidateLotsResponse {
  items: {
    lot_id: number;
    lot_number: string;
    available_quantity: number;
    expiry_date?: string | null;
    product_code?: string | null;
    warehouse_code?: string | null;
  }[];
}

export interface CandidateLotItem {
  lot_id: number;
  lot_number: string;
  free_qty: number;
  current_quantity: number;
  allocated_quantity: number | string;
  allocated_qty?: number;
  supplier_item_id?: number | null;
  product_code?: string | null;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  expiry_date?: string | null | undefined;
  last_updated?: string | null | undefined;

  // Added for compatibility
  available_quantity: number;
  status?: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  lock_reason?: string | null;
  internal_unit?: string | null;
  qty_per_internal_unit?: number | null;
  external_unit?: string | null;
}

// Legacy types for createAllocations
export interface AllocationInputItem {
  lotId: number;
  lot?: unknown; // For UI logic compatibility
  quantity: number;
  delivery_place_id?: number | null;
}

export interface CreateAllocationPayload {
  order_line_id: number;
  allocations: AllocationInputItem[];
  product_code?: string; // Compatibility
}

export interface AllocationResult {
  order_id: number;
}

// ===== Group Planning Summary (計画引当サマリ) =====

export interface PlanningAllocationLotBreakdown {
  lot_id: number;
  lot_number: string | null;
  expiry_date: string | null;
  planned_quantity: number;
  other_group_allocated: number;
}

export interface PlanningAllocationPeriod {
  forecast_period: string;
  planned_quantity: number;
}

export interface PlanningAllocationSummary {
  has_data: boolean;
  total_planned_quantity: number;
  total_demand_quantity: number;
  shortage_quantity: number;
  lot_breakdown: PlanningAllocationLotBreakdown[];
  by_period: PlanningAllocationPeriod[];
}

// ===== Bulk Auto-Allocate (グループ一括引当) =====

export interface BulkAutoAllocateRequest {
  supplier_item_id?: number | null;
  customer_id?: number | null;
  delivery_place_id?: number | null;
  order_type?: "FORECAST_LINKED" | "KANBAN" | "SPOT" | "ORDER" | null;
  skip_already_allocated?: boolean;
}

export interface BulkAutoAllocateFailedLine {
  line_id: number;
  error: string;
}

export interface BulkAutoAllocateResponse {
  processed_lines: number;
  allocated_lines: number;
  total_allocations: number;
  skipped_lines: number;
  failed_lines: BulkAutoAllocateFailedLine[];
  message: string;
}

// ===== Order Auto-Allocate (Batch) =====

export interface BatchAutoOrderRequest {
  order_ids: number[];
  dry_run?: boolean;
}

export interface BatchAutoOrderResult {
  order_id: number;
  success: boolean;
  message?: string;
  created_allocation_ids: number[];
}

export interface BatchAutoOrderResponse {
  results: BatchAutoOrderResult[];
  total_orders: number;
  success_count: number;
  failure_count: number;
  message: string;
}

// ===== Allocation Suggestions API (v1) =====

export interface AllocationSuggestionRequest {
  mode: "forecast" | "order";
  forecast_scope?: {
    forecast_periods: string[];
    customer_ids?: number[];
    delivery_place_ids?: number[];
    supplier_item_ids?: number[];
  };
  order_scope?: {
    order_line_id: number;
  };
  options?: {
    allocation_type?: "soft" | "hard";
    fefo?: boolean;
    allow_cross_warehouse?: boolean;
    ignore_existing_suggestions?: boolean;
  };
}

export interface AllocationSuggestionResponse {
  id: number;
  forecast_period: string;
  customer_id: number;
  delivery_place_id: number;
  supplier_item_id: number;
  lot_id: number;
  quantity: number;
  allocation_type: "soft" | "hard";
  source: string;
  order_line_id?: number | null;
  created_at: string;
  updated_at: string;
  lot_number?: string;
  lot_expiry_date?: string;
  warehouse_name?: string;
  coa_issue_date?: string | null;
  comment?: string | null;
  manual_shipment_date?: string | null;
}

export interface AllocationSuggestionPreviewResponse {
  suggestions: AllocationSuggestionResponse[];
  stats: Record<string, unknown>;
  gaps: unknown[];
}

export interface AllocationSuggestionListResponse {
  suggestions: AllocationSuggestionResponse[];
  total: number;
}

export interface AllocationSuggestionBatchUpdateItem {
  customer_id: number;
  delivery_place_id: number;
  supplier_item_id: number;
  lot_id: number;
  forecast_period: string;
  quantity: number;
  coa_issue_date?: string | null;
  comment?: string | null;
  manual_shipment_date?: string | null;
}

// ===== UI Types =====

export type OrderLine = SharedOrderLine;

/**
 * 優先度レベル
 *
 * 受注カードの優先度を表現します。
 * - urgent: 緊急（納期遅延など）
 * - warning: 警告（在庫不足など）
 * - attention: 注意（引当未完了）
 * - allocated: 引当済み
 * - inactive: 非アクティブ
 */
export type PriorityLevel = "urgent" | "warning" | "attention" | "allocated" | "inactive";

/**
 * 受注情報
 *
 * システム内の受注を表現します。
 */
export interface Order {
  /** 受注ID */
  id: number;
  /** 受注コード（customer_order_noまたはIDから生成される表示用識別子） */
  order_code: string;
  /** 得意先受注番号 */
  customer_order_no?: string | null;
  /** 顧客ID（DDL v2.2） */
  customer_id: number;
  /** 納品場所ID（DDL v2.2） */
  delivery_place_id: number;
  /** 受注日 */
  order_date: string;
  /** ステータス */
  status: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
  // 後方互換性のためのレガシーフィールド
  /** 受注番号（レガシー） */
  order_no?: string;
  /** 顧客コード（レガシー） */
  customer_code?: string | null;
  /** 顧客名（レガシー） */
  customer_name?: string;
  /** 納期（レガシー） */
  due_date?: string | null;
  /** 納品場所コード（レガシー） */
  delivery_place_code?: string | null;
  /** 納品場所名（レガシー） */
  delivery_place_name?: string | null;
  /** 納品場所（レガシー） */
  delivery_place?: string | null;
  /** 合計数量（レガシー） */
  total_quantity?: number | null;
  /** 出荷先（レガシー） */
  ship_to?: string;
  /** 受注明細 */
  lines?: OrderLine[];
}

/**
 * 受注カード表示用データ
 *
 * UI上の受注カードに表示するための拡張された受注情報です。
 */
export interface OrderCardData extends Order {
  /** 優先度レベル */
  priority: PriorityLevel;
  /** 未引当数量 */
  unallocatedQty: number;
  /** 納期までの日数 */
  daysTodue: number | null;
  /** 必須フィールドの欠損有無 */
  hasMissingFields: boolean;
  /** 合計数量 */
  totalQuantity: number;
  /** 主要納品場所 */
  primaryDeliveryPlace?: string | null;
}

/**
 * 倉庫別在庫サマリー情報
 *
 * 倉庫ごとの在庫集計情報を表現します。
 */
export interface WarehouseSummary {
  /** 一意キー */
  key: string;
  /** 倉庫ID */
  warehouseId?: number;
  /** 倉庫コード */
  warehouseCode?: string | null;
  /** 倉庫名 */
  warehouseName?: string | null;
  /** 合計在庫数 */
  totalStock: number;
}

// ===== Consolidated Types from useLotAllocation =====

/**
 * Allocations organized by line ID
 * Record<lineId, Record<lotId, quantity>>
 */
export type AllocationsByLine = Record<number, LineAllocations>;

/**
 * Allocations for a single line
 * Record<lotId, quantity>
 */
export type LineAllocations = Record<number, number>;

/**
 * Line status map
 * Record<lineId, LineStatus>
 */
export type LineStatusMap = Record<number, LineStatus>;

/**
 * Status of an allocation line
 * - clean: No pending changes
 * - draft: Has unsaved changes
 * - committed: Successfully saved
 */
export type LineStatus = "clean" | "draft" | "committed";

/**
 * Toast state for allocation operations
 */
export type AllocationToastState = { message: string; variant: "success" | "error" } | null;

/**
 * Stock status information for an order line
 */
export interface LineStockStatus {
  hasShortage: boolean;
  totalAvailable: number;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  totalAllocated: number;
  remainingQty: number;
  progress: number;
}

/**
 * Function type for fetching candidate lots from cache
 */
export type CandidateLotFetcher = (lineId: number, productId: number) => CandidateLotItem[];

/**
 * Reservation information for cancellation dialog
 */
export interface ReservationInfo {
  id: number;
  lot_id?: number | null;
  lot_number?: string | null;
  reserved_qty?: number | string;
  product_name?: string | null;
  product_code?: string | null;
  order_number?: string | null;
  status?: string;
}

// ===== Reservation Cancel (予約取消) =====

export type ReservationCancelReason =
  | "input_error"
  | "wrong_quantity"
  | "wrong_lot"
  | "wrong_product"
  | "customer_request"
  | "duplicate"
  | "other";

export interface ReservationCancelRequest {
  reason: ReservationCancelReason;
  note?: string | null;
  cancelled_by?: string | null;
}

export interface ReservationCancelResponse {
  id: number;
  lot_id: number | null;
  lot_number: string | null;
  reserved_quantity: string;
  status: string;
  cancel_reason: string | null;
  cancel_reason_label: string | null;
  cancel_note: string | null;
  cancelled_by: string | null;
  released_at: string | null;
  message: string;
}
