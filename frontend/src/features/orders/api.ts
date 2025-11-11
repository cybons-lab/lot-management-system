import { fetchApi } from "@/shared/libs/http";
import type { paths, components } from "@/types/api";
import type { CandidateLotsResponse } from "@/shared/types/aliases";

// api.d.ts から型を抽出
type OrdersGetParams = paths["/api/orders"]["get"]["parameters"]["query"];
type OrdersGetResponse =
  paths["/api/orders"]["get"]["responses"][200]["content"]["application/json"];
type OrderGetResponse =
  paths["/api/orders/{order_id}"]["get"]["responses"][200]["content"]["application/json"];

// 互換性のためのエイリアス型（既存コードで使用中）
export type OrdersListParams = OrdersGetParams;
export type OrderResponse = components["schemas"]["OrderResponse"];
export type OrderWithLinesResponse = components["schemas"]["OrderWithLinesResponse"];

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
  return fetchApi.get<OrdersGetResponse>(`/orders${queryString ? "?" + queryString : ""}`);
};

/**
 * 受注詳細取得
 */
export const getOrder = (orderId: number) => fetchApi.get<OrderGetResponse>(`/orders/${orderId}`);

/**
 * FEFO再マッチング実行
 */
export const reMatchOrder = (orderId: number) =>
  fetchApi.post<components["schemas"]["FefoCommitResponse"]>(`/orders/${orderId}/re-match`);

/**
 * 引当情報付き受注一覧取得
 */
export const getOrdersWithAllocations = (): Promise<unknown> =>
  fetchApi.get("/orders/orders-with-allocations");

/**
 * 倉庫別引当情報取得
 */
export const getWarehouseAllocList = (): Promise<components["schemas"]["WarehouseListResponse"]> =>
  fetchApi.get("/warehouse-alloc/warehouses");

/**
 * 引当候補ロット取得（product_id基準）
 */
export const getCandidateLots = (params: {
  product_id: number;
  warehouse_id?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("product_id", params.product_id.toString());
  if (params.warehouse_id !== undefined)
    searchParams.append("warehouse_id", params.warehouse_id.toString());
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<CandidateLotsResponse>(
    `/allocations/candidate-lots${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * ロット引当実行
 */
export const createLotAllocations = (
  orderLineId: number,
  request: { allocations: { lot_id: number; qty: number }[] },
) =>
  fetchApi.post<{
    success?: boolean;
    message?: string;
    allocated_ids?: number[];
  }>(`/orders/${orderLineId}/allocations`, request);

/**
 * ロット引当キャンセル
 */
export const cancelLotAllocations = (
  orderLineId: number,
  request: { order_line_id?: number; allocation_ids?: number[] },
) =>
  fetchApi.post<{ success?: boolean; message?: string }>(
    `/orders/${orderLineId}/allocations/cancel`,
    request,
  );

/**
 * 倉庫別引当保存
 */
export const saveWarehouseAllocations = (
  orderLineId: number,
  allocations: Array<{
    warehouse_id: number;
    warehouse_code: string;
    warehouse_name?: string;
    lot_id: number;
    quantity: number;
  }>,
) =>
  fetchApi.post<{ success?: boolean; message?: string }>(
    `/orders/${orderLineId}/warehouse-allocations`,
    { allocations },
  );

/**
 * 受注ステータス更新
 */
export const updateOrderStatus = (orderId: number, newStatus: string) =>
  fetchApi.patch<OrderResponse>(`/orders/${orderId}/status`, { status: newStatus });

/**
 * 受注明細ステータス更新
 */
export const updateOrderLineStatus = (orderLineId: number, newStatus: string) =>
  fetchApi.patch<{
    success: boolean;
    message: string;
    order_line_id: number;
    new_status: string;
  }>(`/orders/${orderLineId}/status`, { status: newStatus });
