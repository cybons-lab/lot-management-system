/**
 * Allocations API Client (v2)
 *
 * 【設計意図】引当API設計の設計判断:
 *
 * 1. なぜv1とv2の両方が存在するのか
 *    理由: 段階的なAPI移行（Strangler Fig パターン）
 *    背景:
 *    - 初期実装（v1）: 引当機能を独立したAPIとして実装
 *    - 改善版（v2）: 在庫APIと統合し、より一貫性のある設計に変更
 *    → 既存のUIコンポーネントを壊さずに移行するため、両方を維持
 *    移行戦略:
 *    - createAllocations → saveManualAllocations に委譲（L146-161）
 *    - 新機能は v2 のみで実装
 *    - 旧機能は徐々に v2 に置き換え
 *
 * 2. getAllocationCandidates が Inventory API をラップする理由（L51-89）
 *    理由: ドメイン境界の明確化とコンポーネント依存の最小化
 *    設計判断:
 *    - 引当コンポーネントは「引当候補を取得する」という意図
 *    - 実装詳細として「在庫APIを呼ぶ」ことは隠蔽
 *    メリット:
 *    - 将来的に引当候補の取得ロジックが変わっても、UI側は影響を受けない
 *    - 例: 将来的に引当専用のキャッシュテーブルができても、この関数内で吸収
 *
 * 3. saveManualAllocations のバッチ処理パターン（L406-427）
 *    理由: フロントエンドでの柔軟な引当操作
 *    業務要件:
 *    - ユーザーが画面で複数ロットを選択して一括引当
 *    - 例: 「ロットA: 100個、ロットB: 50個」を一度に引当
 *    実装:
 *    - 各引当を個別にAPIコール（Promise.all で並列実行）
 *    - サーバー側でトランザクション保証は各APIコールで独立
 *    トレードオフ:
 *    - 利点: 実装がシンプル、一部失敗時のリトライが容易
 *    - 欠点: 全体のアトミック性が保証されない（一部成功・一部失敗の可能性）
 *    → 業務上は許容（一部失敗でも、成功した分は引当済みとして扱う）
 *
 * 4. cancelAllocationsByLine の空配列チェック（L171-178）
 *    理由: 不要なAPIコールの削減
 *    業務シナリオ:
 *    - ユーザーが「全解除」ボタンを押したが、実は引当がゼロ件
 *    → サーバーにリクエストを送らず、即座に成功レスポンスを返す
 *    メリット:
 *    - ネットワークトラフィック削減
 *    - サーバー負荷軽減
 *    - レスポンス時間短縮
 *
 * 5. getPlanningAllocationSummary のクエリパラメータ設計（L228-244）
 *    理由: RESTful設計に準拠したリソース検索
 *    設計:
 *    - customer_id, delivery_place_id, product_group_id を必須パラメータ
 *    - forecast_period をオプションパラメータ
 *    業務的意義:
 *    - 「この得意先・納入先・製品の組み合わせで、計画引当がどうなっているか？」
 *    → グループ単位での在庫割当状況を可視化
 *    → 自動車部品商社では、得意先ごとの在庫確保が重要
 *
 * 6. bulkAutoAllocate の skip_already_allocated フラグ（L248-272）
 *    理由: 冪等性の確保と無駄な処理の削減
 *    業務シナリオ:
 *    - ユーザーが「一括自動引当」を誤って2回実行
 *    - skip_already_allocated=true だと、既に引当済みの明細はスキップ
 *    → 二重引当を防ぎつつ、未引当分だけ処理
 *    メリット: ユーザーの操作ミスに対して寛容な設計
 */

import { getAvailableLots } from "../inventory/api"; // Inventory APIからのインポート

import { http } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

// ===== API Types (v2 compatible) =====

export type ManualAllocationRequest =
  paths["/api/v2/allocation/manual"]["post"]["requestBody"]["content"]["application/json"];
export type ManualAllocationResponse =
  paths["/api/v2/allocation/manual"]["post"]["responses"][200]["content"]["application/json"];

export type ManualAllocationBatchResponse = {
  success: boolean;
  created_count: number;
  message: string;
};

export type FefoPreviewRequest =
  paths["/api/v2/allocation/preview"]["post"]["requestBody"]["content"]["application/json"];
export type FefoPreviewResponse =
  paths["/api/v2/allocation/preview"]["post"]["responses"][200]["content"]["application/json"];

export type AllocationCommitRequest =
  paths["/api/v2/allocation/commit"]["post"]["requestBody"]["content"]["application/json"];
export type AllocationCommitResponse =
  paths["/api/v2/allocation/commit"]["post"]["responses"][200]["content"]["application/json"];

// Alias for compatibility
export type CandidateLotsResponse = {
  items: Array<{
    lot_id: number;
    lot_number: string;
    available_quantity: number;
    expiry_date?: string;
    product_code?: string;
    warehouse_code?: string;
  }>;
};

// ===== New API Functions (v2) =====

/**
 * Get allocation candidates for an order line
 * (Wrapper around Inventory API getAvailableLots)
 */
export const getAllocationCandidates = async (params: {
  order_line_id: number;
  product_group_id: number; // Added: required for v2 lot search
  warehouse_id?: number;
  limit?: number;
  strategy?: "fefo" | "fifo" | "custom";
}) => {
  // Call Inventory API v2
  const lots = await getAvailableLots({
    product_group_id: params.product_group_id,
    warehouse_id: params.warehouse_id,
  });

  // Convert to CandidateLotsResponse format
  const items = lots.map((lot) => ({
    lot_id: lot.lot_id,
    lot_number: lot.lot_number || lot.lot_code, // fallback
    available_quantity: lot.available_qty,
    expiry_date: lot.expiry_date,
    product_code: lot.product_code,
    warehouse_code: lot.warehouse_code,
    // Compatibility fields
    free_qty: lot.available_qty,
    current_quantity: lot.available_qty,
    allocated_quantity: 0,
    status: "clean",
    warehouse_name: lot.warehouse_code, // fallback using code
    lock_reason: null,
    internal_unit: null,
    qty_per_internal_unit: null,
    external_unit: null,
  }));

  // Simple sort if needed (server already returns somewhat sorted?)
  // v2 getAvailableLots doesn't guarantee FEFO, list_lots does.
  // getAvailableLots implementation uses InProcessLotClient -> Logic might sort.

  return { items };
};

// ==========================================
// ===== Legacy / v1 API Functions (Restored) =====
// ==========================================

export type CandidateLotItem = {
  lot_id: number;
  lot_number: string;
  free_qty: number;
  current_quantity: number;
  allocated_quantity: number | string;
  allocated_qty?: number;
  product_group_id?: number | null;
  product_code?: string | null;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  expiry_date?: string | null;
  last_updated?: string | null;

  // Added for compatibility
  available_quantity: number;
  status?: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  lock_reason?: string | null;
  internal_unit?: string | null;
  qty_per_internal_unit?: number | null;
  external_unit?: string | null;
};

// Legacy types for createAllocations
export type AllocationInputItem = {
  lotId: number;
  lot?: unknown; // For UI logic compatibility
  quantity: number;
  delivery_place_id?: number | null;
};

export type CreateAllocationPayload = {
  order_line_id: number;
  allocations: AllocationInputItem[];
  product_code?: string; // Compatibility
  // other fields if necessary
};

export type AllocationResult = {
  order_id: number;
};

/**
 * Create allocations for an order line
 * @deprecated Use saveManualAllocations instead for v2 API
 *
 * This function now delegates to saveManualAllocations (v2) for compatibility
 */
export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  // Convert legacy payload format to v2 format
  const v2Allocations = payload.allocations.map((a) => ({
    lot_id: a.lotId,
    quantity: a.quantity,
  }));

  await saveManualAllocations({
    order_line_id: payload.order_line_id,
    allocations: v2Allocations,
  });

  return { order_id: payload.order_line_id };
}

/**
 * Cancel all allocations for an order line
 * Uses bulk-cancel endpoint with allocation IDs
 *
 * @param orderLineId - Order line ID
 * @param allocationIds - Array of allocation IDs to cancel (must be provided by caller)
 */
export const cancelAllocationsByLine = async (_orderLineId: number, allocationIds: number[]) => {
  if (allocationIds.length === 0) {
    return {
      success: true,
      message: "No allocations to cancel",
      cancelled_ids: [] as number[],
      failed_ids: [] as number[],
    };
  }

  const result = await http.post<{
    cancelled_ids: number[];
    failed_ids: number[];
    message: string;
  }>("allocations/bulk-cancel", { allocation_ids: allocationIds });

  return {
    success: result.failed_ids.length === 0,
    message: result.message,
    cancelled_ids: result.cancelled_ids,
    failed_ids: result.failed_ids,
  };
};

export const confirmAllocationsBatch = (data: {
  allocation_ids: number[];
  confirmed_by?: string;
}) => {
  return http.post<{ confirmed_ids: number[]; failed_items: { id: number; error: string }[] }>(
    "allocations/confirm-batch",
    data,
  );
};

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

export const getPlanningAllocationSummary = (params: {
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
  forecast_period?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("customer_id", params.customer_id.toString());
  searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  searchParams.append("product_group_id", params.product_group_id.toString());
  if (params.forecast_period) {
    searchParams.append("forecast_period", params.forecast_period);
  }
  return http.get<PlanningAllocationSummary>(
    `v2/forecast/suggestions/group-summary?${searchParams.toString()}`,
  );
};

// ===== Bulk Auto-Allocate (グループ一括引当) =====

export interface BulkAutoAllocateRequest {
  product_group_id?: number | null;
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

export const bulkAutoAllocate = (data: BulkAutoAllocateRequest) => {
  return http.post<BulkAutoAllocateResponse>("allocations/bulk-auto-allocate", data);
};

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

export const autoAllocateOrders = (data: BatchAutoOrderRequest) => {
  return http.post<BatchAutoOrderResponse>("allocations/auto-orders", data);
};

// ===== Allocation Suggestions API (v1) =====

export type AllocationSuggestionRequest = {
  mode: "forecast" | "order";
  forecast_scope?: {
    forecast_periods: string[];
    customer_ids?: number[];
    delivery_place_ids?: number[];
    product_group_ids?: number[];
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
};

export type AllocationSuggestionResponse = {
  id: number;
  forecast_period: string;
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
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
};

export type AllocationSuggestionPreviewResponse = {
  suggestions: AllocationSuggestionResponse[];
  stats: Record<string, unknown>;
  gaps: unknown[];
};

export type AllocationSuggestionListResponse = {
  suggestions: AllocationSuggestionResponse[];
  total: number;
};

export const generateAllocationSuggestions = (data: AllocationSuggestionRequest) => {
  return http.post<AllocationSuggestionPreviewResponse>("v2/forecast/suggestions/preview", data);
};

export const getAllocationSuggestions = (
  params: {
    skip?: number;
    limit?: number;
    forecast_period?: string;
    product_group_id?: number;
    customer_id?: number;
  } = {},
) => {
  const searchParams = new URLSearchParams();
  if (params.skip) searchParams.append("skip", params.skip.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.forecast_period) searchParams.append("forecast_period", params.forecast_period);
  if (params.product_group_id)
    searchParams.append("product_group_id", params.product_group_id.toString());
  if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());

  const queryString = searchParams.toString();
  return http.get<AllocationSuggestionListResponse>(
    `v2/forecast/suggestions${queryString ? "?" + queryString : ""}`,
  );
};

export interface AllocationSuggestionBatchUpdateItem {
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
  lot_id: number;
  forecast_period: string;
  quantity: number;
}

export const updateAllocationSuggestionsBatch = (data: {
  updates: AllocationSuggestionBatchUpdateItem[];
}) => {
  return http.post<{ status: string; updated_count: number; message: string }>(
    "v2/forecast/suggestions/batch",
    data,
  );
};

export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return http.post<ManualAllocationResponse>("v2/allocation/manual", data);
};

/**
 * Create FEFO allocation suggestion (preview only)
 * @endpoint POST /api/v2/allocation/preview
 */
export const createFefoAllocationSuggestion = (data: FefoPreviewRequest) => {
  return http.post<FefoPreviewResponse>("v2/allocation/preview", data);
};

/**
 * Commit allocation (Finalize soft allocations to hard)
 * @endpoint POST /api/v2/allocation/commit
 */
export const commitAllocation = (data: AllocationCommitRequest) => {
  return http.post<AllocationCommitResponse>("v2/allocation/commit", data);
};

/**
 * Cancel allocation
 * @endpoint DELETE /api/v2/allocation/{id}
 */
export const cancelAllocation = (allocationId: number) => {
  return http.delete<void>(`v2/allocation/${allocationId}`);
};

/**
 * Save manual allocations for a specific order line (Batch wrapper)
 * Calls createManualAllocationSuggestion for each item.
 */
export const saveManualAllocations = async (data: {
  order_line_id: number;
  allocations: Array<{
    lot_id: number;
    quantity: number;
  }>;
}) => {
  const promises = data.allocations.map((a) =>
    createManualAllocationSuggestion({
      order_line_id: data.order_line_id,
      lot_id: a.lot_id,
      allocated_quantity: a.quantity,
    }),
  );

  const results = await Promise.all(promises);
  return {
    success: true,
    created_count: results.length,
    message: "Allocations saved successfully",
  };
};

/**
 * List allocations by order
 * @endpoint GET /api/v2/allocation/by-order/{order_id}
 */
export const getAllocationsByOrder = (orderId: number) => {
  return http.get<ManualAllocationResponse[]>(`v2/allocation/by-order/${orderId}`);
};

// ===== Reservation Cancel (予約取消) =====

export type ReservationCancelReason =
  | "input_error"
  | "wrong_quantity"
  | "wrong_lot"
  | "wrong_product"
  | "customer_request"
  | "duplicate"
  | "other";

export const RESERVATION_CANCEL_REASON_LABELS: Record<ReservationCancelReason, string> = {
  input_error: "入力ミス",
  wrong_quantity: "数量誤り",
  wrong_lot: "ロット選択誤り",
  wrong_product: "品目誤り",
  customer_request: "顧客都合",
  duplicate: "重複登録",
  other: "その他",
};

export const RESERVATION_CANCEL_REASONS: Array<{ value: ReservationCancelReason; label: string }> =
  [
    { value: "input_error", label: "入力ミス" },
    { value: "wrong_quantity", label: "数量誤り" },
    { value: "wrong_lot", label: "ロット選択誤り" },
    { value: "wrong_product", label: "品目誤り" },
    { value: "customer_request", label: "顧客都合" },
    { value: "duplicate", label: "重複登録" },
    { value: "other", label: "その他" },
  ];

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

/**
 * Cancel a CONFIRMED reservation (reversal transaction)
 * @endpoint POST /api/allocations/{allocation_id}/cancel
 */
export const cancelConfirmedReservation = (
  allocationId: number,
  data: ReservationCancelRequest,
) => {
  return http.post<ReservationCancelResponse>(`allocations/${allocationId}/cancel`, data);
};
