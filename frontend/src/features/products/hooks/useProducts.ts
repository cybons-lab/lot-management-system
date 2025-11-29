import type { Product, ProductCreate, ProductUpdate } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useProducts = () => {
  return useMasterApi<Product, ProductCreate, ProductUpdate>("masters/products", "products");
};
