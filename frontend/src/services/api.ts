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
  getDashboardStats: () => http.get<DashboardStats>("dashboard/stats"),

  /**
   * マスタ変更履歴を取得
   * @param params クエリパラメータ
   * @returns マスタ変更履歴リスト
   */
  getMasterChangeLogs: (params?: { page?: number; limit?: number }) =>
    http.get<MasterChangeLogListResponse>("master-change-logs", {
      searchParams: {
        skip: ((params?.page || 1) - 1) * (params?.limit || 10),
        limit: params?.limit || 10,
      },
    }),
};

export interface MasterChangeLog {
  change_log_id: number;
  table_name: string;
  record_id: number;
  change_type: "insert" | "update" | "delete";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: number;
  changed_at: string;
}

export interface MasterChangeLogListResponse {
  logs: MasterChangeLog[];
  total: number;
  page: number;
  page_size: number;
}
