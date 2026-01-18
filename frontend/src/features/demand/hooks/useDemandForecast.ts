import { useQuery } from "@tanstack/react-query";

import { getDemandForecast, type DemandForecastParams } from "@/services/api/demand-service";

export function useDemandForecast(params: DemandForecastParams) {
  return useQuery({
    queryKey: ["demand", "forecast", params],
    queryFn: () => getDemandForecast(params),
    enabled: !!params.product_id,
  });
}
