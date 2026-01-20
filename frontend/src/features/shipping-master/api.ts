/**
 * 出荷用マスタデータ API client
 */

import httpClient from "@/shared/api/http-client";
import type { components } from "@/types/api";

type ShippingMasterCurated = components["schemas"]["ShippingMasterCuratedResponse"];
type ShippingMasterCreate = components["schemas"]["ShippingMasterCuratedCreate"];
type ShippingMasterUpdate = components["schemas"]["ShippingMasterCuratedUpdate"];

interface ShippingMasterListParams {
  customer_code?: string;
  material_code?: string;
  jiku_code?: string;
  limit?: number;
  offset?: number;
}

interface ShippingMasterListResponse {
  items: ShippingMasterCurated[];
  total: number;
}

export const shippingMasterApi = {
  /**
   * 出荷用マスタ一覧取得
   */
  list: async (params?: ShippingMasterListParams): Promise<ShippingMasterListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.customer_code) searchParams.set("customer_code", params.customer_code);
    if (params?.material_code) searchParams.set("material_code", params.material_code);
    if (params?.jiku_code) searchParams.set("jiku_code", params.jiku_code);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const response = await httpClient.get(`shipping-masters?${searchParams}`);
    return response.json();
  },

  /**
   * 出荷用マスタ取得
   */
  get: async (id: number): Promise<ShippingMasterCurated> => {
    const response = await httpClient.get(`shipping-masters/${id}`);
    return response.json();
  },

  /**
   * 出荷用マスタ作成
   */
  create: async (data: ShippingMasterCreate): Promise<ShippingMasterCurated> => {
    const response = await httpClient.post("shipping-masters", {
      json: data,
    });
    return response.json();
  },

  /**
   * 出荷用マスタ更新
   */
  update: async (id: number, data: ShippingMasterUpdate): Promise<ShippingMasterCurated> => {
    const response = await httpClient.put(`shipping-masters/${id}`, {
      json: data,
    });
    return response.json();
  },

  /**
   * 出荷用マスタ削除
   */
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`shipping-masters/${id}`);
  },
};
