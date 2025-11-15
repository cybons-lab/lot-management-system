// API client for products (v2.2 - Phase F)
import { fetchApi } from "@/shared/libs/http";
import type { Product } from "@/shared/types/aliases";

/**
 * Get all products
 * @endpoint GET /products (was /masters/products)
 */
export const getProducts = () => fetchApi.get<Product[]>("/products");
