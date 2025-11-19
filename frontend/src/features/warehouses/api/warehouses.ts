// API client for warehouses (v2.2 - Phase F)
import { fetchApi } from "@/shared/libs/http";
import type { OldWarehouse } from "@/shared/types/aliases";

/**
 * Get all warehouses
 * @endpoint GET /warehouses
 */
export const getWarehouses = () => fetchApi.get<OldWarehouse[]>("/warehouses");
