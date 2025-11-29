import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Supplier, SupplierCreate, SupplierUpdate } from "../api";

export function useSuppliers() {
  return useMasterApi<Supplier, SupplierCreate, SupplierUpdate>("masters/suppliers", "suppliers");
}
