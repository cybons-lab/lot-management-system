/**
 * useWarehousesQuery - 倉庫一覧取得
 */
import { useQuery } from "@tanstack/react-query";
import { listWarehouses, type Warehouse } from "../api/warehouses-api";

export const WAREHOUSES_QUERY_KEY = ["warehouses"] as const;

export function useWarehousesQuery() {
  return useQuery<Warehouse[], Error>({
    queryKey: WAREHOUSES_QUERY_KEY,
    queryFn: listWarehouses,
  });
}
