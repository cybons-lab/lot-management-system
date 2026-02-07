import type { OrdersListParams, OrderGetResponse, WarehouseAllocationItem } from "./types";

import { http } from "@/shared/api/http-client";
import type { OrderLine } from "@/shared/types/aliases";
import type {
  CandidateLotsResponse,
  OrderResponse,
  AllocationCommitResponse,
  ManualAllocationSavePayload,
} from "@/shared/types/schema";

export * from "./types";

/**
 * クエリパラメータを構築するヘルパー
 */
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? "?" + queryString : "";
}

/**
 * 受注一覧取得
 */
export const getOrders = (params?: OrdersListParams & { prioritize_assigned?: boolean }) => {
  const queryString = buildQueryParams(params ?? {});
  return http.get<OrderResponse[]>(`orders${queryString}`);
};

export const getOrderLines = (
  params?: OrdersListParams & { product_code?: string; prioritize_assigned?: boolean },
) => {
  const queryString = buildQueryParams(params ?? {});
  // Note: OrderLineResponse[] is returned, but we use OrderLine[] alias in frontend
  return http.get<OrderLine[]>(`orders/lines${queryString}`);
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
export const getWarehouseAllocList = (): Promise<unknown> => http.get("warehouse-alloc/warehouses");

/**
 * 引当候補ロット取得（supplier_item_id基準）
 * @endpoint GET /allocation-candidates (was /allocations/candidate-lots - deprecated 2026-02-15)
 */
export const getCandidateLots = (params: { order_line_id: number; limit?: number }) => {
  const searchParams = new URLSearchParams();
  searchParams.append("order_line_id", params.order_line_id.toString());
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

export async function acquireOrderLock(orderId: number): Promise<void> {
  await http.post(`orders/${orderId}/lock`, {});
}

export async function releaseOrderLock(orderId: number): Promise<void> {
  await http.delete(`orders/${orderId}/lock`);
}
