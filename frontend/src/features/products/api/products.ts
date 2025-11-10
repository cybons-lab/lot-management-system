// Auto-generated from api-client.ts split
import { fetchApi } from "@/shared/libs/http";
import type { Product } from "@/shared/types/aliases";

export const getProducts = () => fetchApi.get<Product[]>("/masters/products");
