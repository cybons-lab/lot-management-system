import type { SupplierProductResponse as SupplierProduct } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useSupplierProducts = () => {
  return useMasterApi<SupplierProduct>("masters/supplier-products", "supplier-products");
};
