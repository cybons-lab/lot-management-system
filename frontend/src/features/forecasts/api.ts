import { fetchApi } from "@/shared/libs/http";
import type { operations } from "@/shared/types/openapi";
import type {
  Forecast,
  ForecastGroupKey,
  ForecastGroup,
  ForecastListResponse,
  ForecastHistory,
  CreateForecastRequest,
  UpdateForecastRequest,
  BulkImportForecastRequest,
  BulkImportForecastSummary,
} from "@/shared/types/schema";

// ===== Types =====

export type {
  Forecast,
  ForecastGroupKey,
  ForecastGroup,
  ForecastListResponse,
  ForecastHistory,
  CreateForecastRequest,
  UpdateForecastRequest,
  BulkImportForecastRequest,
  BulkImportForecastSummary,
};

export type ForecastListParams =
  operations["list_forecasts_api_forecasts_get"]["parameters"]["query"];
export type ForecastHistoryParams =
  operations["list_forecast_history_api_forecasts_history_get"]["parameters"]["query"];

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
export const getForecastHistory = (params?: ForecastHistoryParams) => {
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
