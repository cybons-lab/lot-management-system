/**
 * Warehouse Delivery Routes API Types
 */

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type WarehouseDeliveryRoute = components["schemas"]["WarehouseDeliveryRouteResponse"];
export type WarehouseDeliveryRouteCreate = components["schemas"]["WarehouseDeliveryRouteCreate"];
export type WarehouseDeliveryRouteUpdate = components["schemas"]["WarehouseDeliveryRouteUpdate"];
export type TransportLeadTimeResponse = components["schemas"]["TransportLeadTimeResponse"];

const BASE_PATH = "masters/warehouse-delivery-routes";

/**
 * Lookup transport lead time with fallback logic
 */
export async function lookupTransportLeadTime(params: {
  warehouse_id: number;
  delivery_place_id: number;
  product_id?: number;
}): Promise<TransportLeadTimeResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("warehouse_id", String(params.warehouse_id));
  searchParams.set("delivery_place_id", String(params.delivery_place_id));
  if (params.product_id) {
    searchParams.set("product_id", String(params.product_id));
  }
  return http.get<TransportLeadTimeResponse>(`${BASE_PATH}/lookup?${searchParams.toString()}`);
}
