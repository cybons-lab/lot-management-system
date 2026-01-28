import { http } from "@/shared/api/http-client";
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
import type { operations } from "@/types/api";

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
  if (params?.product_group_id)
    searchParams.append("product_group_id", params.product_group_id.toString());

  const queryString = searchParams.toString();
  return http.get<ForecastListResponse>(`forecasts${queryString ? "?" + queryString : ""}`);
};

/**
 * Get forecast by ID
 * @endpoint GET /forecasts/{id}
 */
export const getForecast = (id: number) => {
  return http.get<Forecast>(`forecasts/${id}`);
};

/**
 * Create forecast entry
 * @endpoint POST /forecasts
 */
export const createForecast = (data: CreateForecastRequest) => {
  return http.post<Forecast>("forecasts", data);
};

/**
 * Update forecast entry
 * @endpoint PUT /forecasts/{id}
 */
export const updateForecast = (id: number, data: UpdateForecastRequest) => {
  return http.put<Forecast>(`forecasts/${id}`, data);
};

/**
 * Delete forecast entry
 * @endpoint DELETE /forecasts/{id}
 */
export const deleteForecast = (id: number) => {
  return http.delete<void>(`forecasts/${id}`);
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
  if (params?.product_group_id)
    searchParams.append("product_group_id", params.product_group_id.toString());

  const queryString = searchParams.toString();
  return http.get<ForecastHistory[]>(`forecasts/history${queryString ? "?" + queryString : ""}`);
};

/**
 * Bulk import forecasts
 * @endpoint POST /forecasts/bulk-import
 */
export const bulkImportForecasts = (data: BulkImportForecastRequest) => {
  return http.post<BulkImportForecastSummary>("forecasts/bulk-import", data);
};

/**
 * Regenerate allocation suggestions for a specific forecast group
 * @endpoint POST /v2/forecast/suggestions/regenerate-group
 */
export interface RegenerateGroupSuggestionsParams {
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
  forecast_period?: string;
}

export interface RegenerateGroupSuggestionsResponse {
  suggestions: unknown[];
  stats: {
    total_forecast_quantity: number;
    total_allocated_quantity: number;
    total_shortage_quantity: number;
    per_key: unknown[];
  };
  gaps: unknown[];
}

export const regenerateGroupSuggestions = (params: RegenerateGroupSuggestionsParams) => {
  const searchParams = new URLSearchParams();
  searchParams.append("customer_id", params.customer_id.toString());
  searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  searchParams.append("product_group_id", params.product_group_id.toString());
  if (params.forecast_period) {
    searchParams.append("forecast_period", params.forecast_period);
  }

  return http.post<RegenerateGroupSuggestionsResponse>(
    `v2/forecast/suggestions/regenerate-group?${searchParams.toString()}`,
    {},
  );
};

/**
 * Clear allocation suggestions for a specific forecast group
 * @endpoint DELETE /v2/forecast/suggestions/clear-group
 */
export interface ClearGroupSuggestionsResponse {
  status: string;
  deleted_count: number;
  message: string;
}

export const clearGroupSuggestions = (params: RegenerateGroupSuggestionsParams) => {
  const searchParams = new URLSearchParams();
  searchParams.append("customer_id", params.customer_id.toString());
  searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  searchParams.append("product_group_id", params.product_group_id.toString());
  if (params.forecast_period) {
    searchParams.append("forecast_period", params.forecast_period);
  }

  return http.delete<ClearGroupSuggestionsResponse>(
    `v2/forecast/suggestions/clear-group?${searchParams.toString()}`,
  );
};
