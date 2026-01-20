/**
 * OCR結果データ API client
 */

import httpClient from "@/shared/api/http-client";
import type { components } from "@/types/api";

type OrderRegisterRow = components["schemas"]["OrderRegisterRowResponse"];

interface OrderRegisterListParams {
  task_date?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface OrderRegisterListResponse {
  items: OrderRegisterRow[];
  total: number;
}

export const ocrResultsApi = {
  /**
   * OCR結果一覧取得
   */
  list: async (params?: OrderRegisterListParams): Promise<OrderRegisterListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.task_date) searchParams.set("task_date", params.task_date);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const response = await httpClient.get(`order-register?${searchParams}`);
    return response.json();
  },

  /**
   * OCR結果詳細取得
   */
  get: async (id: number): Promise<OrderRegisterRow> => {
    const response = await httpClient.get(`order-register/${id}`);
    return response.json();
  },

  /**
   * Excelエクスポート
   */
  exportExcel: async (params?: { task_date?: string; status?: string }): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (params?.task_date) searchParams.set("task_date", params.task_date);
    if (params?.status) searchParams.set("status", params.status);

    const url = `order-register/export/excel?${searchParams}`;
    const response = await httpClient.get(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `受注情報登録_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
