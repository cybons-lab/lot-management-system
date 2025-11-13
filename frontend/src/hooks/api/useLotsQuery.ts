// src/hooks/api/useLotsQuery.ts
import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";
import type { paths } from "@/types/api";

type LotsQueryBase = paths["/api/lots"]["get"]["parameters"]["query"];
type LotsQuery = LotsQueryBase & { delivery_place_code?: string | null };
type LotResponseBase =
  paths["/api/lots"]["get"]["responses"][200]["content"]["application/json"][number];
type LotResponse = LotResponseBase & {
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
};

export const useLotsQuery = (params?: LotsQuery) =>
  useQuery<LotResponse[], Error, LotUI[]>({
    queryKey: ["lots", params],
    queryFn: () => getLots(params),
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: (data) => (data ?? []).map(normalizeLot),
  });
