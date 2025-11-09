// src/hooks/api/useLotsQuery.ts
import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import type { paths } from "@/types/api";

type LotsQuery = paths["/api/lots"]["get"]["parameters"]["query"];
export const useLotsQuery = (params?: LotsQuery) =>
  useQuery({
    queryKey: ["lots", params],
    queryFn: () => getLots(params),
    staleTime: 30_000,
    placeholderData: [],
  });
