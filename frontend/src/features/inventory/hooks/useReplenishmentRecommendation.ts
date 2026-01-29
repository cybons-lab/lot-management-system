import { useQuery } from "@tanstack/react-query";

import {
  runReplenishment,
  type RunReplenishmentParams,
} from "@/services/api/replenishment-service";

export function useReplenishmentRecommendation(params: RunReplenishmentParams) {
  return useQuery({
    queryKey: ["replenishment", "recommendation", params],
    queryFn: () => runReplenishment(params),
    enabled: !!params.warehouse_id && (!!params.product_group_ids?.length || false),
    staleTime: 0, // Always fresh for now as we re-calculate
  });
}
