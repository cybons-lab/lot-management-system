/**
 * Single Product Query Hook
 */
import { useQuery } from "@tanstack/react-query";

import { getProduct } from "../api/products-api";

export function useProductQuery(makerPartCode: string | undefined) {
  return useQuery({
    queryKey: ["products", makerPartCode],
    queryFn: () => getProduct(makerPartCode!),
    enabled: !!makerPartCode,
  });
}
