/**
 * useWarehouseQuery - 倉庫詳細取得
 */
import { useQuery } from "@tanstack/react-query";
import { getWarehouse, type Warehouse } from "../api/warehouses-api";

export function useWarehouseQuery(warehouseCode: string | undefined) {
  return useQuery<Warehouse, Error>({
    queryKey: ["warehouses", warehouseCode],
    queryFn: () => getWarehouse(warehouseCode!),
    enabled: !!warehouseCode,
  });
}
