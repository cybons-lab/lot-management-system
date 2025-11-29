import type { Supplier, SupplierCreate, SupplierUpdate } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export function useSuppliers() {
  return useMasterApi<Supplier, SupplierCreate, SupplierUpdate>("masters/suppliers", "suppliers");
}
