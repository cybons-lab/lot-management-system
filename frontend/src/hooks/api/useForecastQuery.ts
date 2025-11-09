// src/features/forecast/api.ts
import { fetchApi } from "@/lib/http";
import { toSearchParams } from "@/lib/query";
import type { paths } from "@/types/api";

type ForecastQuery = paths["/api/forecast"]["get"]["parameters"]["query"];
type ForecastRes = paths["/api/forecast"]["get"]["responses"][200]["content"]["application/json"];

export const getForecasts = (params?: ForecastQuery) => {
  const qs = params ? `?${toSearchParams(params as Record<string, unknown>)}` : "";
  return fetchApi.get<ForecastRes>(`/forecasts${qs}`);
};
