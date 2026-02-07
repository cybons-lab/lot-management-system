import type { operations } from "@/types/api";

// api.d.ts から型を抽出
export type OrdersListParams = operations["list_orders_api_orders_get"]["parameters"]["query"];
export type OrderGetResponse =
  operations["get_order_api_orders__order_id__get"]["responses"][200]["content"]["application/json"];

export interface WarehouseAllocationItem {
  delivery_place_id: number;
  delivery_place_code: string;
  warehouse_name?: string;
  lot_id: number;
  quantity: number;
}
