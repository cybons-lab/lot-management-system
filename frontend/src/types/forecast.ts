// Forecast types relaxed to accommodate current UI usage
export type ForecastResponse = {
  id?: number;
  product_code?: string;
  granularity?: "daily" | "dekad" | "monthly";
  date_day?: string | null;
  date_dekad_start?: string | null;
  year_month?: string | null;
  forecast_qty?: number | null;
  qty_forecast?: number | null;
  version_no?: number | null;
  version_issued_at?: string | null;
};
