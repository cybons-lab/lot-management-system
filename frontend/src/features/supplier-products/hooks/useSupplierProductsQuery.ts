/**
 * useSupplierProductsQuery - Query hook for supplier products list
 * Phase1: メーカー品番マスタの読み取り専用hook
 */

import { useQuery } from "@tanstack/react-query";

import { getSupplierProducts, type SupplierProduct } from "../api";

export function useSupplierProductsQuery() {
  return useQuery<SupplierProduct[]>({
    queryKey: ["supplier-items"],
    queryFn: () => getSupplierProducts(),
  });
}
