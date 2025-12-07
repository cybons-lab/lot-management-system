/**
 * API Client
 * フロントエンドからバックエンドAPIへのリクエストを管理
 *
 * 注: 各機能固有のAPIは features/＊/api.ts で定義
 */

import { http } from "@/shared/api/http-client";

// ========================================
// 型定義
// ========================================

export type DashboardStats = {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
  allocation_rate: number;
};

// ========================================
// APIクライアント
// ========================================

export const api = {
  /**
   * ダッシュボード統計を取得
   * @returns ダッシュボード統計情報
   */
  getDashboardStats: () => http.get<DashboardStats>("admin/stats"),
};
