// src/hooks/useLots.ts
import { useQuery } from "@tanstack/react-query";

import { http as fetchApi } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

type LotsList = paths["/api/lots"]["get"]["responses"]["200"]["content"]["application/json"];
type LotsQuery = paths["/api/lots"]["get"]["parameters"]["query"];
type LotDetail =
  paths["/api/lots/{lot_id}"]["get"]["responses"]["200"]["content"]["application/json"];

export function useLots(params?: LotsQuery) {
  return useQuery({
    queryKey: ["lots", params],
    queryFn: () => fetchApi.get<LotsList>("/lots", { searchParams: params as any }),
  });
}
export function useLot(lotId: number | string) {
  return useQuery({
    queryKey: ["lot", lotId],
    queryFn: () => fetchApi.get<LotDetail>(`/lots/${lotId}`),
    enabled: !!lotId,
  });
}
