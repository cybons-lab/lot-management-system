/**
 * Customer Item Delivery Settings API
 * 得意先品番-納入先別設定のAPI関数
 */

import { http } from "@/shared/api/http-client";

// Types
export interface CustomerItemDeliverySetting {
  id: number;
  customer_id: number;
  external_product_code: string;
  delivery_place_id: number | null;
  jiku_code: string | null;
  shipment_text: string | null;
  packing_note: string | null;
  lead_time_days: number | null;
  is_default: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliverySettingRequest {
  customer_id: number;
  external_product_code: string;
  delivery_place_id?: number | null;
  jiku_code?: string | null;
  shipment_text?: string | null;
  packing_note?: string | null;
  lead_time_days?: number | null;
  is_default?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface UpdateDeliverySettingRequest {
  delivery_place_id?: number | null;
  jiku_code?: string | null;
  shipment_text?: string | null;
  packing_note?: string | null;
  lead_time_days?: number | null;
  is_default?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}

// API functions
const BASE_PATH = "masters/customer-item-delivery-settings";

export async function fetchDeliverySettings(
  customerId: number,
  externalProductCode: string,
): Promise<CustomerItemDeliverySetting[]> {
  return http.get<CustomerItemDeliverySetting[]>(
    `${BASE_PATH}/?customer_id=${customerId}&external_product_code=${encodeURIComponent(externalProductCode)}`,
  );
}

export async function createDeliverySetting(
  data: CreateDeliverySettingRequest,
): Promise<CustomerItemDeliverySetting> {
  return http.post<CustomerItemDeliverySetting>(`${BASE_PATH}/`, data);
}

export async function updateDeliverySetting(
  id: number,
  data: UpdateDeliverySettingRequest,
): Promise<CustomerItemDeliverySetting> {
  return http.put<CustomerItemDeliverySetting>(`${BASE_PATH}/${id}`, data);
}

export async function deleteDeliverySetting(id: number): Promise<void> {
  return http.delete<void>(`${BASE_PATH}/${id}`);
}
