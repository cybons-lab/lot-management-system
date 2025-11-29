import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Warehouse, WarehouseCreate, WarehouseUpdate } from "../api";

export const useWarehouses = () => {
  return useMasterApi<Warehouse, WarehouseCreate, WarehouseUpdate>(
    "masters/warehouses",
    "warehouses",
  );
};
