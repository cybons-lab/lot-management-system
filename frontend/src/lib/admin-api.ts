// frontend/src/lib/admin-api.ts
import { fetchApi } from "@/lib/http";

export type DashboardStats = {
  total_stock: number;
  total_orders: number;
  unallocated_orders: number;
};
export type ResetResponse = {
  success: boolean;
  message: string;
};
/**
 * 管理ダッシュボード等「自分だけが触れる」前提のエンドポイント群。
 * JWT は lib/http.ts 側で自動付与されます（localStorage "access_token" or "jwt"）。
 */

export const getStats = () => fetchApi.get<DashboardStats>("/admin/stats");

export const resetDatabase = () => fetchApi.post<ResetResponse>("/admin/reset-database");

export interface FullSampleDataRequest {
  products?: Array<{
    product_code: string;
    product_name: string;
    requires_lot_number: boolean;
  }>;
  lots?: Array<{
    supplier_code: string;
    product_code: string;
    lot_number: string;
    receipt_date: string;
    expiry_date?: string | null;
    warehouse_code: string;
  }>;
  receipts?: Array<{
    receipt_no: string;
    supplier_code: string;
    warehouse_code: string;
    receipt_date: string;
    lines: Array<{
      line_no: number;
      product_code: string;
      lot_id?: number;
      lot_number?: string;
      quantity: number;
      unit: string;
    }>;
  }>;
  orders?: Array<{
    order_no: string;
    customer_code: string;
    order_date?: string | null;
    lines: Array<{
      line_no: number;
      product_code: string;
      quantity: number;
      unit: string;
      due_date?: string | null;
    }>;
  }>;
}

export const loadFullSampleData = (payload: FullSampleDataRequest) =>
  fetchApi.post<{ success: boolean; message: string }>("/admin/load-full-sample-data", payload);
