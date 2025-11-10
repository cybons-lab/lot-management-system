// src/hooks/api/useLotsQuery.ts
import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";
import type { paths } from "@/types/api";

type LotsQuery = paths["/api/lots"]["get"]["parameters"]["query"];
type LotResponse =
  paths["/api/lots"]["get"]["responses"][200]["content"]["application/json"][number];

export const useLotsQuery = (params?: LotsQuery) =>
  useQuery<LotResponse[], Error, LotUI[]>({
    queryKey: ["lots", params],
    queryFn: () => getLots(params),
    staleTime: 30_000,
    initialData: [],
    select: (data) => (data ?? []).map(normalizeLot),
  });
