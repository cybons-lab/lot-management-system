import type { Warehouse, WarehouseCreate, WarehouseUpdate } from "../api";

import { useMasterApi } from "@/shared/hooks/useMasterApi";

export const useWarehouses = () => {
  return useMasterApi<Warehouse, WarehouseCreate, WarehouseUpdate>(
    "masters/warehouses",
    "warehouses",
  );
};
