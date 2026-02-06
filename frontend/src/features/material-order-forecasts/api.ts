import { type paths } from "../../types/api";

import { apiClient } from "@/shared/api/http-client";

export type MaterialOrderForecastListResponse =
  paths["/api/material-order-forecasts"]["get"]["responses"]["200"]["content"]["application/json"];
export type MaterialOrderForecast = MaterialOrderForecastListResponse["items"][number];
export type MaterialOrderForecastImportResponse =
  paths["/api/material-order-forecasts/import"]["post"]["responses"]["200"]["content"]["application/json"];

export interface GetForecastsParams {
  target_month?: string;
  material_code?: string;
  maker_code?: string;
  jiku_code?: string;
  limit?: number;
  offset?: number;
}

export const materialOrderForecastsApi = {
  getForecasts: async (params?: GetForecastsParams): Promise<MaterialOrderForecastListResponse> => {
    return apiClient
      .get("material-order-forecasts", {
        searchParams: params as unknown as Record<string, string | number | boolean | undefined>,
      })
      .json();
  },

  importCsv: async (file: File): Promise<MaterialOrderForecastImportResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("material-order-forecasts/import", { body: formData }).json();
  },

  deleteForecast: async (id: number): Promise<void> => {
    await apiClient.delete(`material-order-forecasts/${id}`);
  },

  deleteForecastsByTargetMonth: async (targetMonth: string): Promise<void> => {
    await apiClient.delete("material-order-forecasts", {
      searchParams: { target_month: targetMonth },
    });
  },
};
