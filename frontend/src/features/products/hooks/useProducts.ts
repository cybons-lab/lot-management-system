import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Product, ProductCreate, ProductUpdate } from "../api";

export const useProducts = () => {
  return useMasterApi<Product, ProductCreate, ProductUpdate>("masters/products", "products");
};
