// Auto-generated from api-client.ts split
import { fetchApi } from "@/shared/libs/http";
import type { OldWarehouse } from "@/shared/types/aliases";

export const getWarehouses = () => fetchApi.get<OldWarehouse[]>("/masters/warehouses");
