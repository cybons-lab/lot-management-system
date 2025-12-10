/**
 * Delivery Places API
 */
import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type DeliveryPlace = components["schemas"]["DeliveryPlaceResponse"];
export type DeliveryPlaceCreate = components["schemas"]["DeliveryPlaceCreate"];
export type DeliveryPlaceUpdate = components["schemas"]["DeliveryPlaceUpdate"];

const BASE_PATH = "masters/delivery-places";

export async function fetchDeliveryPlaces(customerId?: number): Promise<DeliveryPlace[]> {
  const params = customerId ? `?customer_id=${customerId}` : "";
  return http.get<DeliveryPlace[]>(`${BASE_PATH}${params}`);
}

export async function fetchDeliveryPlace(id: number): Promise<DeliveryPlace> {
  return http.get<DeliveryPlace>(`${BASE_PATH}/${id}`);
}

export async function createDeliveryPlace(data: DeliveryPlaceCreate): Promise<DeliveryPlace> {
  return http.post<DeliveryPlace>(BASE_PATH, data);
}

export async function updateDeliveryPlace(
  id: number,
  data: DeliveryPlaceUpdate,
): Promise<DeliveryPlace> {
  return http.put<DeliveryPlace>(`${BASE_PATH}/${id}`, data);
}

export async function deleteDeliveryPlace(id: number): Promise<void> {
  return http.deleteVoid(`${BASE_PATH}/${id}`);
}
