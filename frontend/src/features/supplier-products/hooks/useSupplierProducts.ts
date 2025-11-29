import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { SupplierProductResponse as SupplierProduct } from "../api";

export const useSupplierProducts = () => {
  return useMasterApi<SupplierProduct>("masters/supplier-products", "supplier-products");
};
