/**
 * Suppliers List Query Hook
 */
import { useQuery } from "@tanstack/react-query";

import { listSuppliers } from "../api/suppliers-api";

export const suppliersQueryKey = ["suppliers"] as const;

export function useSuppliersQuery() {
  return useQuery({
    queryKey: suppliersQueryKey,
    queryFn: listSuppliers,
  });
}
