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

  importCsv: async (
    file: File,
    targetMonth?: string,
  ): Promise<MaterialOrderForecastImportResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (targetMonth) {
      formData.append("target_month", targetMonth);
    }
    return apiClient.post("material-order-forecasts/import", { body: formData }).json();
  },
};
