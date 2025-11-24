/**
 * Single Product Query Hook
 */
import { useQuery } from "@tanstack/react-query";

import { getProduct } from "../api/products-api";

export function useProductQuery(productCode: string | undefined) {
  return useQuery({
    queryKey: ["products", productCode],
    queryFn: () => getProduct(productCode!),
    enabled: !!productCode,
  });
}
