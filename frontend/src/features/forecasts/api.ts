/**
 * Forecast API Client (v2.2 - Phase B)
 * ヘッダ・明細分離構造に対応
 */

import { fetchApi } from "@/shared/libs/http";

// ===== Types =====

/**
 * Forecast Header
 */
export interface ForecastHeader {
  id: number;
  forecast_number: string;
  customer_id: number;
  delivery_place_id: number;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  customer_name?: string;
  delivery_place_name?: string;
}

/**
 * Forecast Line
 */
export interface ForecastLine {
  id: number;
  forecast_header_id: number;
  line_number: number;
  product_id: number;
  quantity: number;
  forecast_date: string;
  granularity: "daily" | "dekad" | "monthly";
  version_no?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  product_code?: string;
  product_name?: string;
}

/**
 * Forecast Header with Lines
 */
export interface ForecastHeaderWithLines extends ForecastHeader {
  lines: ForecastLine[];
}

/**
 * Request types
 */
export interface CreateForecastHeaderRequest {
  forecast_number: string;
  customer_id: number;
  delivery_place_id: number;
  status?: "active" | "completed" | "cancelled";
  notes?: string;
  lines?: CreateForecastLineRequest[];
}

export interface UpdateForecastHeaderRequest {
  forecast_number?: string;
  customer_id?: number;
  delivery_place_id?: number;
  status?: "active" | "completed" | "cancelled";
  notes?: string;
}

export interface CreateForecastLineRequest {
  line_number?: number;
  product_id: number;
  quantity: number;
  forecast_date: string;
  granularity: "daily" | "dekad" | "monthly";
  version_no?: number;
  notes?: string;
}

export interface UpdateForecastLineRequest {
  line_number?: number;
  product_id?: number;
  quantity?: number;
  forecast_date?: string;
  granularity?: "daily" | "dekad" | "monthly";
  version_no?: number;
  notes?: string;
}

export interface BulkImportForecastRequest {
  forecasts: Array<{
    forecast_number: string;
    customer_id: number;
    delivery_place_id: number;
    lines: CreateForecastLineRequest[];
  }>;
}

export interface ForecastHeadersListParams {
  skip?: number;
  limit?: number;
  customer_id?: number;
  delivery_place_id?: number;
  status?: "active" | "completed" | "cancelled";
}

// ===== API Functions =====

/**
 * Get forecast headers list
 * @endpoint GET /forecasts/headers
 */
export const getForecastHeaders = (params?: ForecastHeadersListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.customer_id) searchParams.append("customer_id", params.customer_id.toString());
  if (params?.delivery_place_id)
    searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  if (params?.status) searchParams.append("status", params.status);

  const queryString = searchParams.toString();
  return fetchApi.get<ForecastHeader[]>(
    `/forecasts/headers${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Get forecast header detail (with lines)
 * @endpoint GET /forecasts/headers/{id}
 */
export const getForecastHeader = (id: number) => {
  return fetchApi.get<ForecastHeaderWithLines>(`/forecasts/headers/${id}`);
};

/**
 * Create forecast header (with optional lines)
 * @endpoint POST /forecasts/headers
 */
export const createForecastHeader = (data: CreateForecastHeaderRequest) => {
  return fetchApi.post<ForecastHeader>("/forecasts/headers", data);
};

/**
 * Update forecast header
 * @endpoint PUT /forecasts/headers/{id}
 */
export const updateForecastHeader = (id: number, data: UpdateForecastHeaderRequest) => {
  return fetchApi.put<ForecastHeader>(`/forecasts/headers/${id}`, data);
};

/**
 * Delete forecast header
 * @endpoint DELETE /forecasts/headers/{id}
 */
export const deleteForecastHeader = (id: number) => {
  return fetchApi.delete<void>(`/forecasts/headers/${id}`);
};

/**
 * Get forecast lines for a header
 * @endpoint GET /forecasts/headers/{id}/lines
 */
export const getForecastLines = (headerId: number) => {
  return fetchApi.get<ForecastLine[]>(`/forecasts/headers/${headerId}/lines`);
};

/**
 * Add forecast line to a header
 * @endpoint POST /forecasts/headers/{id}/lines
 */
export const createForecastLine = (headerId: number, data: CreateForecastLineRequest) => {
  return fetchApi.post<ForecastLine>(`/forecasts/headers/${headerId}/lines`, data);
};

/**
 * Update forecast line
 * @endpoint PUT /forecasts/lines/{id}
 */
export const updateForecastLine = (id: number, data: UpdateForecastLineRequest) => {
  return fetchApi.put<ForecastLine>(`/forecasts/lines/${id}`, data);
};

/**
 * Delete forecast line
 * @endpoint DELETE /forecasts/lines/{id}
 */
export const deleteForecastLine = (id: number) => {
  return fetchApi.delete<void>(`/forecasts/lines/${id}`);
};

/**
 * Bulk import forecasts
 * @endpoint POST /forecasts/headers/bulk-import
 */
export const bulkImportForecasts = (data: BulkImportForecastRequest) => {
  return fetchApi.post<{ imported_count: number }>("/forecasts/headers/bulk-import", data);
};
