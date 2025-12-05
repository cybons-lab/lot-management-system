import { http } from "@/shared/api/http-client";
import type { OrderLine } from "@/shared/types/aliases";
import type {
  CandidateLotsResponse,
  OrderResponse,
  AllocationCommitResponse,
  WarehouseListResponse,
  ManualAllocationSavePayload,
} from "@/shared/types/schema";
import type { operations } from "@/types/api";

// api.d.ts から型を抽出
export type OrdersListParams = operations["list_orders_api_orders_get"]["parameters"]["query"];
type OrderGetResponse =
  operations["get_order_api_orders__order_id__get"]["responses"][200]["content"]["application/json"];

/**
 * 受注一覧取得
 *
 * 利用可能なパラメータ:
 * - skip, limit: ページネーション
 * - status: ステータスフィルタ
 * - customer_code: 得意先コードフィルタ
 * - date_from, date_to: 日付範囲フィルタ
 */
export const getOrders = (params?: OrdersListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.status) searchParams.append("status", params.status);
  if (params?.customer_code) searchParams.append("customer_code", params.customer_code);
  if (params?.date_from) searchParams.append("date_from", params.date_from);
  if (params?.date_to) searchParams.append("date_to", params.date_to);

  const queryString = searchParams.toString();
  return http.get<OrderResponse[]>(`orders${queryString ? "?" + queryString : ""}`);
};

export const getOrderLines = (params?: OrdersListParams & { product_code?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.status) searchParams.append("status", params.status);
  if (params?.customer_code) searchParams.append("customer_code", params.customer_code);
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.order_type) searchParams.append("order_type", params.order_type);
  if (params?.date_from) searchParams.append("date_from", params.date_from);
  if (params?.date_to) searchParams.append("date_to", params.date_to);

  const queryString = searchParams.toString();
  // Note: OrderLineResponse[] is returned, but we use OrderLine[] alias in frontend
  return http.get<OrderLine[]>(`orders/lines${queryString ? "?" + queryString : ""}`);
};

/**
 * 受注詳細取得
 */
export const getOrder = (orderId: number) => http.get<OrderGetResponse>(`orders/${orderId}`);

/**
 * FEFO再マッチング実行
 * @description 新しいAllocationCommitResponseを使用（FefoCommitResponseは非推奨）
 */
export const reMatchOrder = (orderId: number) =>
  http.post<AllocationCommitResponse>(`orders/${orderId}/re-match`);

/**
 * 引当情報付き受注一覧取得
 */
export const getOrdersWithAllocations = (): Promise<unknown> =>
  http.get("orders/orders-with-allocations");

/**
 * 倉庫別引当情報取得
 */
export const getWarehouseAllocList = (): Promise<WarehouseListResponse> =>
  http.get("warehouse-alloc/warehouses");

/**
 * 引当候補ロット取得（product_id基準）
 * @endpoint GET /allocation-candidates (was /allocations/candidate-lots - deprecated 2026-02-15)
 */
export const getCandidateLots = (params: {
  product_id: number;
  delivery_place_id?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("product_id", params.product_id.toString());
  if (params.delivery_place_id !== undefined)
    searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return http.get<CandidateLotsResponse>(
    `allocation-candidates${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * ロット引当実行
 */
export const createLotAllocations = (orderLineId: number, request: ManualAllocationSavePayload) =>
  http.post<{
    success?: boolean;
    message?: string;
    allocated_ids?: number[];
  }>(`orders/${orderLineId}/allocations`, request);

/**
 * ロット引当キャンセル
 */
export const cancelLotAllocations = (
  orderLineId: number,
  request: { order_line_id?: number; allocation_ids?: number[] },
) =>
  http.post<{ success?: boolean; message?: string }>(
    `orders/${orderLineId}/allocations/cancel`,
    request,
  );

export type WarehouseAllocationItem = {
  delivery_place_id: number;
  delivery_place_code: string;
  warehouse_name?: string;
  lot_id: number;
  quantity: number;
};

/**
 * 倉庫別引当保存
 */
export const saveWarehouseAllocations = (
  orderLineId: number,
  allocations: WarehouseAllocationItem[],
) =>
  http.post<{ success?: boolean; message?: string }>(
    `orders/${orderLineId}/warehouse-allocations`,
    { allocations },
  );

/**
 * 受注ステータス更新
 */
export const updateOrderStatus = (orderId: number, newStatus: string) =>
  http.patch<OrderResponse>(`orders/${orderId}/status`, { status: newStatus });

/**
 * 受注明細ステータス更新
 */
export const updateOrderLineStatus = (orderLineId: number, newStatus: string) =>
  http.patch<{
    success: boolean;
    message: string;
    order_line_id: number;
    new_status: string;
  }>(`orders/${orderLineId}/status`, { status: newStatus });
