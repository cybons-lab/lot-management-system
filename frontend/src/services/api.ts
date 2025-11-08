/**
 * API Client
 * フロントエンドからバックエンドAPIへのリクエストを管理
 * 全てのメソッドは http.get/post(...).then(r => r.data) で統一
 */

import { http } from "./http";
import type { components } from "@/types/api";

// ========================================
// 型定義
// ========================================

// ダッシュボード
type DashboardStats = components["schemas"]["DashboardStatsResponse"];

// 受注関連の型
type Order = components["schemas"]["OrderResponse"];
type OrderDetail = components["schemas"]["OrderWithLinesResponse"];

// 引当関連の型
type DragAssignRequest = components["schemas"]["DragAssignRequest"];
type DragAssignResponse = components["schemas"]["DragAssignResponse"];

// ロット関連の型
type Lot = components["schemas"]["LotResponse"];

// Forecast関連の型（存在する型を使用）
type ForecastResponse = components["schemas"]["ForecastResponse"];

// ========================================
// APIクライアント
// ========================================

export const api = {
  // ===== ダッシュボード =====
  /**
   * ダッシュボード統計を取得
   * @returns ダッシュボード統計情報
   */
  getDashboardStats: () =>
    http.get<DashboardStats>("/admin/stats").then((r) => r.data),

  // ===== 受注 =====
  /**
   * 受注一覧を取得
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns 受注リスト
   */
  getOrders: (params?: Record<string, unknown>) =>
    http.get<Order[]>("/orders", { params }).then((r) => r.data),

  /**
   * 受注詳細を取得
   * @param orderId 受注ID
   * @returns 受注詳細（明細行を含む）
   */
  getOrderDetail: (orderId: number) =>
    http.get<OrderDetail>(`/orders/${orderId}`).then((r) => r.data),

  // ===== ロット =====
  /**
   * ロット一覧を取得
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns ロットリスト
   */
  listLots: (params?: Record<string, unknown>) =>
    http.get<Lot[]>("/lots", { params }).then((r) => r.data),

  // ===== 引当 =====
  /**
   * ドラッグ&ドロップによる引当実行
   * @param body 引当リクエストデータ
   * @returns 引当結果
   */
  dragAssignAllocation: (body: DragAssignRequest) =>
    http
      .post<DragAssignResponse>("/allocations/drag-assign", body)
      .then((r) => r.data),

  // ===== Forecast =====
  /**
   * Forecast一覧を取得
   * @param params クエリパラメータ（フィルタ条件など）
   * @returns Forecastリスト
   */
  listForecasts: (params?: Record<string, unknown>) =>
    http.get<ForecastResponse[]>("/forecast", { params }).then((r) => r.data),
};

// ========================================
// 型のエクスポート
// ========================================

export type {
  DashboardStats,
  Order,
  OrderDetail,
  DragAssignRequest,
  DragAssignResponse,
  Lot,
  ForecastResponse,
};
