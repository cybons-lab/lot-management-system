/**
 * API Client
 * フロントエンドからバックエンドAPIへのリクエストを管理
 */

import { http } from "@/shared/api/http-client";

import type { ForecastListResponse } from "@/features/forecasts/api";
import type {
  OrderResponse as Order,
  OrderWithLinesResponse as OrderDetail,
} from "@/shared/types/aliases";
import type { components } from "@/types/api";

// ========================================
// 型定義
// ========================================

// 受注関連の型

// ロット関連の型
type Lot = components["schemas"]["LotResponse"];

// ========================================
// APIクライアント
// ========================================

export const api = {
  // ===== ダッシュボード =====
  /**
   * ダッシュボード統計を取得
   * @returns ダッシュボード統計情報
   */
  getDashboardStats: () => http.get<DashboardStats>("admin/stats"),

  // ===== 受注 =====
  /**
   * 受注一覧を取得
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns 受注リスト
   */
  getOrders: (params?: Record<string, unknown>) =>
    http.get<Order[]>("orders", { searchParams: params as any }),

  /**
   * 受注詳細を取得
   * @param orderId 受注ID
   * @returns 受注詳細（明細行を含む）
   */
  getOrderDetail: (orderId: number) => http.get<OrderDetail>(`orders/${orderId}`),

  // ===== ロット =====
  /**
   * ロット一覧を取得
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns ロットリスト
   */
  listLots: (params?: Record<string, unknown>) =>
    http.get<Lot[]>("lots", { searchParams: params as any }),

  // ===== Forecast =====
  /**
   * Forecast一覧を取得 (v2.4)
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns Forecastグループリスト
   */
  listForecasts: (params?: Record<string, unknown>) =>
    http.get<ForecastListResponse>("forecasts", { searchParams: params as any }),
};

// ========================================
// 型のエクスポート
// ========================================

export type { Order, OrderDetail, Lot, ForecastListResponse };

// === Compat helpers added by patch ===
export type DashboardStats = {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
  allocation_rate: number;
};
interface OrdersResponse {
  items?: unknown[];
}

export async function getOrdersWithAllocations() {
  const data = await http.get<OrdersResponse>("orders");
  return Array.isArray(data?.items) ? data : { items: data ?? [] };
}
export async function reMatchOrder(orderId: number) {
  return await http.post(`orders/${orderId}/re-match`, {});
}
// Attach to api object if present
Object.assign(api, { getOrdersWithAllocations, reMatchOrder });
