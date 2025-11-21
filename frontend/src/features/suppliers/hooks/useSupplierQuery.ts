/**
 * Single Supplier Query Hook
 */
import { useQuery } from "@tanstack/react-query";

import { getSupplier } from "../api/suppliers-api";

export function useSupplierQuery(supplierCode: string | undefined) {
  return useQuery({
    queryKey: ["suppliers", supplierCode],
    queryFn: () => getSupplier(supplierCode!),
    enabled: !!supplierCode,
  });
}
