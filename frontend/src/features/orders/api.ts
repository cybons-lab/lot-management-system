// Auto-generated from api-client.ts split
import { fetchApi } from "@/lib/http";
import type {
  OrdersListParams,
  OrderResponse,
  OrderWithLinesResponse,
  ReMatchResponse,
  OrdersWithAllocResponse,
  WarehouseListResponse,
  LotCandidate,
  LotAllocationRequest,
  LotAllocationResponse,
  SaveAllocationsRequest,
  SaveAllocationsResponse,
  WarehouseAlloc,
} from "@/types";

export const getOrders = (params: OrdersListParams) => {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined)
    searchParams.append("skip", params.skip.toString());
  if (params.limit !== undefined)
    searchParams.append("limit", params.limit.toString());
  if (params.status) searchParams.append("status", params.status);
  if (params.customer_code)
    searchParams.append("customer_code", params.customer_code);

  const queryString = searchParams.toString();
  return fetchApi<OrderResponse[]>(
    `/orders${queryString ? "?" + queryString : ""}`,
    { method: "GET" }
  );
};

export const getOrder = (orderId: number) =>
  fetchApi<OrderWithLinesResponse>(`/orders/${orderId}`, { method: "GET" });

export const reMatchOrder = (orderId: number) =>
  fetchApi<ReMatchResponse>(`/orders/${orderId}/re-match`, { method: "POST" });

export const getOrdersWithAllocations = () =>
  fetchApi<OrdersWithAllocResponse>("/orders/orders-with-allocations", {
    method: "GET",
  });

export const getWarehouseAllocList = () =>
  fetchApi<WarehouseListResponse>("/warehouse-alloc/warehouses", {
    method: "GET",
  });

export const getCandidateLots = (orderLineId: number) =>
  fetchApi<{ items: LotCandidate[] }>(`/orders/${orderLineId}/candidate-lots`, {
    method: "GET",
  });

export const createLotAllocations = (
  orderLineId: number,
  request: LotAllocationRequest
) =>
  fetchApi<LotAllocationResponse>(`/orders/${orderLineId}/allocations`, {
    method: "POST",
    body: JSON.stringify(request),
  });

export const cancelLotAllocations = (
  orderLineId: number,
  request: any /* AllocationCancelRequest 型は現行types未定義のためanyに退避 */
) =>
  fetchApi<any /* AllocationCancelResponse */>(
    `/orders/${orderLineId}/allocations/cancel`,
    { method: "POST", body: JSON.stringify(request) }
  );

export const saveWarehouseAllocations = (
  orderLineId: number,
  allocations: WarehouseAlloc[]
) =>
  fetchApi<SaveAllocationsResponse>(
    `/orders/${orderLineId}/warehouse-allocations`,
    {
      method: "POST",
      body: JSON.stringify({ allocations } as SaveAllocationsRequest),
    }
  );

export const updateOrderLineStatus = (orderLineId: number, newStatus: string) =>
  fetchApi<{
    success: boolean;
    message: string;
    order_line_id: number;
    new_status: string;
  }>(`/orders/${orderLineId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
