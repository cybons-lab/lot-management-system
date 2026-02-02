import { http } from "@/shared/api/http-client";

export interface ReplenishmentRecommendation {
  id: string;
  product_group_id: number;
  warehouse_id: number;
  supplier_id: number;

  // === 提案内容 ===
  recommended_order_qty: number;
  recommended_order_date: string; // date string
  expected_arrival_date: string; // date string

  // === 計算根拠 ===
  reorder_point: number;
  safety_stock: number;
  target_stock: number;

  // === 現在状況 ===
  current_on_hand: number;
  current_reserved: number;
  current_available: number;
  pending_inbound: number;

  // === 需要予測 ===
  avg_daily_demand: number;
  demand_forecast_horizon: number;
  demand_forecast_total: number;

  // === リードタイム ===
  lead_time_days: number;
  lead_time_std: number;

  // === 制約適用 ===
  moq?: number | null;
  lot_size?: number | null;
  constraints_applied: string[];

  // === メタ情報 ===
  created_at: string; // datetime string
  status: string;
  explanation: string;
}

export interface RunReplenishmentParams {
  warehouse_id: number;
  product_group_ids?: number[];
  as_of_date?: string;
  method?: string;
}

const BASE_PATH = "admin/replenishment";

/**
 * 発注提案の実行
 */
export async function runReplenishment(
  params: RunReplenishmentParams,
): Promise<ReplenishmentRecommendation[]> {
  const searchParams = new URLSearchParams();
  searchParams.append("warehouse_id", String(params.warehouse_id));
  if (params.as_of_date) {
    searchParams.append("as_of_date", params.as_of_date);
  }
  if (params.method) {
    searchParams.append("method", params.method);
  }
  if (params.product_group_ids?.length) {
    params.product_group_ids.forEach((id) => searchParams.append("product_group_ids", String(id)));
  }

  return http.post<ReplenishmentRecommendation[]>(`${BASE_PATH}/recommendations/run`, null, {
    searchParams,
  });
}
