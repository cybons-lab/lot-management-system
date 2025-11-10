// src/hooks/useForecasts.ts
import { useQuery } from "@tanstack/react-query";

import { fetchApi } from "@/shared/libs/http";
import type { paths } from "@/types/api";

type ForecastList =
  paths["/api/forecast"]["get"]["responses"]["200"]["content"]["application/json"];
type ForecastQuery = paths["/api/forecast"]["get"]["parameters"]["query"];
type ForecastDetail =
  paths["/api/forecast/{forecast_id}"]["get"]["responses"]["200"]["content"]["application/json"];

export function useForecasts(params?: ForecastQuery) {
  return useQuery({
    queryKey: ["forecast", params],
    queryFn: () => fetchApi.get<ForecastList>("/forecast", { params }),
  });
}
export function useForecast(id: number | string) {
  return useQuery({
    queryKey: ["forecast", id],
    queryFn: () => fetchApi.get<ForecastDetail>(`/forecast/${id}`),
    enabled: !!id,
  });
}
