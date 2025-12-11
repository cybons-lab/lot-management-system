import {
  type SupplierProduct,
  type SupplierProductCreate,
  type SupplierProductUpdate,
} from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useSupplierProducts = () => {
  return useMasterApi<SupplierProduct, SupplierProductCreate, SupplierProductUpdate>(
    "masters/supplier-products",
    "supplier-products",
  );
};
