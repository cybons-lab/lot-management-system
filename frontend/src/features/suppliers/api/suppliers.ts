// API client for suppliers (v2.2 - Phase F)
import { fetchApi } from "@/shared/libs/http";
import type { Supplier } from "@/shared/types/aliases";

/**
 * Get all suppliers
 * @endpoint GET /suppliers (was /masters/suppliers)
 */
export const getSuppliers = () => fetchApi.get<Supplier[]>("/suppliers");
