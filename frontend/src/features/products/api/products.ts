// API client for products (v2.2 - Phase F)
import { fetchApi } from "@/shared/libs/http";
import type { Product } from "@/shared/types/aliases";

const BASE_URL = "/products";

/**
 * Get all products
 * @endpoint GET /products
 */
export const getProducts = () => fetchApi.get<Product[]>(BASE_URL);
