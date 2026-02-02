import { http } from "@/shared/api/http-client";

export interface DailyForecast {
  date: string;
  quantity: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
}

export interface DemandForecast {
  supplier_item_id: number;
  warehouse_id?: number | null;
  generated_at: string;
  horizon_days: number;
  daily_forecasts: DailyForecast[];
  confidence_level: number;
}

export interface DemandForecastParams {
  supplier_item_id: number;
  warehouse_id?: number;
  horizon_days?: number;
  method?: "moving_average_seasonal" | "ewma" | "moving_average";
  as_of_date?: string;
}

const BASE_PATH = "admin/demand";

/**
 * 需要予測を取得
 */
export async function getDemandForecast(params: DemandForecastParams): Promise<DemandForecast> {
  return http.get<DemandForecast>(`${BASE_PATH}/forecast`, {
    searchParams: params as unknown as Record<string, string | number | boolean | undefined>,
  });
}
