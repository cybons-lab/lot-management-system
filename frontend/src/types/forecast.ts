export type ForecastGranularity = "daily" | "dekad" | "monthly";

export interface ForecastResponse {
  id: number;
  forecast_id: string;
  product_id: string;
  client_id: string;
  supplier_id: string;
  granularity: ForecastGranularity;
  qty_forecast: number;
  version_no: number;
  source_system: string;
  is_active: boolean;
  date_day?: string | null;
  date_dekad_start?: string | null;
  year_month?: string | null;
  version_issued_at: string;
  created_at: string;
  updated_at?: string | null;
}
