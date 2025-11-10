/**
 * Order Service
 * 受注関連のAPI通信関数
 */

import { http } from "@/services/http";
import type {
  OrderResponse,
  OrderWithLinesResponse,
  OrdersListParams,
} from "@/shared/types/aliases";
import type { OrderCreate, OrderUpdate } from "@/utils/validators";

const BASE_PATH = "/orders";

/**
 * 受注一覧を取得
 */
export async function listOrders(params?: OrdersListParams): Promise<OrderResponse[]> {
  const response = await http.get<OrderResponse[]>(BASE_PATH, { params });
  return response.data;
}

/**
 * 受注詳細を取得（明細含む）
 */
export async function getOrderById(id: number): Promise<OrderWithLinesResponse> {
  const response = await http.get<OrderWithLinesResponse>(`${BASE_PATH}/${id}`);
  return response.data;
}

/**
 * 受注を作成
 */
export async function createOrder(data: OrderCreate): Promise<OrderWithLinesResponse> {
  const response = await http.post<OrderWithLinesResponse>(BASE_PATH, data);
  return response.data;
}

/**
 * 受注ステータスを更新
 */
export async function updateOrderStatus(
  id: number,
  data: { status: string },
): Promise<{ success: boolean; order: OrderWithLinesResponse }> {
  const response = await http.patch<{ success: boolean; order: OrderWithLinesResponse }>(
    `${BASE_PATH}/${id}/status`,
    data,
  );
  return response.data;
}

/**
 * 受注を削除
 */
export async function deleteOrder(id: number): Promise<void> {
  await http.delete(`${BASE_PATH}/${id}`);
}

/**
 * ステータス別に受注を取得
 */
export async function listOrdersByStatus(status: string): Promise<OrderResponse[]> {
  return listOrders({ status });
}

/**
 * 保留中の受注を取得
 */
export async function listPendingOrders(): Promise<OrderResponse[]> {
  return listOrdersByStatus("pending");
}

/**
 * 引当済みの受注を取得
 */
export async function listAllocatedOrders(): Promise<OrderResponse[]> {
  return listOrdersByStatus("allocated");
}

/**
 * 出荷済みの受注を取得
 */
export async function listShippedOrders(): Promise<OrderResponse[]> {
  return listOrdersByStatus("shipped");
}

/**
 * 特定得意先の受注を取得
 */
export async function listOrdersByCustomer(customerCode: string): Promise<OrderResponse[]> {
  return listOrders({ customer_code: customerCode });
}
export async function getOrderDetail(orderId: number): Promise<OrderWithLinesResponse> {
  const response = await http.get<OrderWithLinesResponse>(`/orders/${orderId}`);
  return response.data;
}

export async function updateOrder(
  orderId: number,
  data: OrderUpdate,
): Promise<OrderWithLinesResponse> {
  const response = await http.put<OrderWithLinesResponse>(`/orders/${orderId}`, data);
  return response.data;
}
