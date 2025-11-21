/**
 * Products List Query Hook
 */
import { useQuery } from "@tanstack/react-query";

import { listProducts } from "../api/products-api";

export const productsQueryKey = ["products"] as const;

export function useProductsQuery() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: listProducts,
  });
}
