import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Product } from "../api";

export const useProducts = () => {
    return useMasterApi<Product>("masters/products", "products");
};
