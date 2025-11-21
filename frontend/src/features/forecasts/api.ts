/**
 * Forecast API Client (v2.4)
 * forecast_current / forecast_history構造に対応
 */

import { fetchApi } from "@/shared/libs/http";

// ===== Types =====

/**
 * Single forecast entry (1 row = customer × delivery_place × product × date)
 */
export interface Forecast {
  id: number;
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_date: string;
  forecast_quantity: number;
  unit: string | null;
  forecast_period: string;
  snapshot_at: string;
  created_at: string;
  updated_at: string;
  // Joined master data
  customer_code?: string;
  customer_name?: string;
  delivery_place_code?: string;
  delivery_place_name?: string;
  product_code?: string;
  product_name?: string;
}

/**
 * Group key for customer × delivery_place × product
 */
export interface ForecastGroupKey {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  customer_code?: string;
  customer_name?: string;
  delivery_place_code?: string;
  delivery_place_name?: string;
  product_code?: string;
  product_name?: string;
}

/**
 * Grouped forecasts response
 */
export interface ForecastGroup {
  group_key: ForecastGroupKey;
  forecasts: Forecast[];
  snapshot_at: string | null;
}

/**
 * List response with grouped forecasts
 */
export interface ForecastListResponse {
  items: ForecastGroup[];
  total: number;
}

/**
 * Forecast history entry
 */
export interface ForecastHistory {
  id: number;
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_date: string;
  forecast_quantity: number;
  unit: string | null;
  forecast_period: string;
  snapshot_at: string;
  archived_at: string;
  created_at: string;
  updated_at: string;
  // Joined master data
  customer_code?: string;
  customer_name?: string;
  delivery_place_code?: string;
  delivery_place_name?: string;
  product_code?: string;
  product_name?: string;
}

/**
 * Request types
 */
export interface CreateForecastRequest {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_date: string;
  forecast_quantity: number;
  unit?: string;
  forecast_period: string;
}

export interface UpdateForecastRequest {
  forecast_quantity?: number;
  unit?: string;
}

export interface BulkImportItem {
  customer_code: string;
  delivery_place_code: string;
  product_code: string;
  forecast_date: string;
  forecast_quantity: number;
  unit?: string;
  forecast_period: string;
}

export interface BulkImportForecastRequest {
  items: BulkImportItem[];
  replace_existing?: boolean;
}

export interface BulkImportForecastSummary {
  imported_count: number;
  archived_count: number;
  skipped_count: number;
  errors: string[];
}

export interface ForecastListParams {
  skip?: number;
  limit?: number;
  customer_id?: number;
  delivery_place_id?: number;
  product_id?: number;
}

// ===== API Functions =====

/**
 * Get forecasts list (grouped by customer × delivery_place × product)
 * @endpoint GET /forecasts
 */
export const getForecasts = (params?: ForecastListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.customer_id) searchParams.append("customer_id", params.customer_id.toString());
  if (params?.delivery_place_id)
    searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  if (params?.product_id) searchParams.append("product_id", params.product_id.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<ForecastListResponse>(`/forecasts${queryString ? "?" + queryString : ""}`);
};

/**
 * Get forecast by ID
 * @endpoint GET /forecasts/{id}
 */
export const getForecast = (id: number) => {
  return fetchApi.get<Forecast>(`/forecasts/${id}`);
};

/**
 * Create forecast entry
 * @endpoint POST /forecasts
 */
export const createForecast = (data: CreateForecastRequest) => {
  return fetchApi.post<Forecast>("/forecasts", data);
};

/**
 * Update forecast entry
 * @endpoint PUT /forecasts/{id}
 */
export const updateForecast = (id: number, data: UpdateForecastRequest) => {
  return fetchApi.put<Forecast>(`/forecasts/${id}`, data);
};

/**
 * Delete forecast entry
 * @endpoint DELETE /forecasts/{id}
 */
export const deleteForecast = (id: number) => {
  return fetchApi.delete<void>(`/forecasts/${id}`);
};

/**
 * Get forecast history
 * @endpoint GET /forecasts/history
 */
export const getForecastHistory = (params?: ForecastListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.customer_id) searchParams.append("customer_id", params.customer_id.toString());
  if (params?.delivery_place_id)
    searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  if (params?.product_id) searchParams.append("product_id", params.product_id.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<ForecastHistory[]>(
    `/forecasts/history${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Bulk import forecasts
 * @endpoint POST /forecasts/bulk-import
 */
export const bulkImportForecasts = (data: BulkImportForecastRequest) => {
  return fetchApi.post<BulkImportForecastSummary>("/forecasts/bulk-import", data);
};
