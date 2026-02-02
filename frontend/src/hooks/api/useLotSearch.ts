import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { searchLots, type LotSearchParams } from "@/features/inventory/api";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";

export type LotSearchUI = {
  items: LotUI[];
  total: number;
  page: number;
  size: number;
};

export function useLotSearch(params: LotSearchParams) {
  return useQuery<LotSearchUI>({
    queryKey: ["lots", "search", params],
    queryFn: async () => {
      const response = await searchLots(params);
      return {
        ...response,
        items: response.items.map((item) =>
          normalizeLot({
            ...item,
            // normalizeLot expects lot_id, supplier_item_id, warehouse_id which are in LotResponse
            // TypeScript might need reassurance if strict
            lot_id: item.lot_id,
            supplier_item_id: item.supplier_item_id,
            warehouse_id: item.warehouse_id,
          } as unknown as Parameters<typeof normalizeLot>[0]),
        ),
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
}
