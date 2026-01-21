/**
 * OCR結果データ API client (v_ocr_resultsビューベース)
 */

import { http } from "@/shared/api/http-client";

export interface OcrResultItem {
  id: number;
  wide_data_id: number | null;
  config_id: number;
  task_id: string;
  task_date: string;
  request_id_ref: number | null;
  row_index: number;
  status: string;
  error_reason: string | null;
  content: Record<string, unknown>;
  created_at: string;

  // OCR由来
  customer_code: string | null;
  material_code: string | null;
  jiku_code: string | null;
  delivery_date: string | null;
  delivery_quantity: string | null;
  item_no: string | null;
  order_unit: string | null;
  inbound_no: string | null;
  lot_no: string | null;

  // マスタ由来
  master_id: number | null;
  customer_name: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  delivery_place_code: string | null;
  delivery_place_name: string | null;
  shipping_warehouse_code: string | null;
  shipping_warehouse_name: string | null;
  shipping_slip_text: string | null;
  transport_lt_days: number | null;
  customer_part_no: string | null;
  maker_part_no: string | null;
  has_order: boolean | null;

  // エラーフラグ
  master_not_found: boolean;
  jiku_format_error: boolean;
  date_format_error: boolean;
  has_error: boolean;
}

interface OcrResultListParams {
  task_date?: string;
  status?: string;
  has_error?: boolean;
  limit?: number;
  offset?: number;
}

interface OcrResultListResponse {
  items: OcrResultItem[];
  total: number;
}

export const ocrResultsApi = {
  /**
   * OCR結果一覧取得（v_ocr_resultsビューから）
   */
  list: async (params?: OcrResultListParams): Promise<OcrResultListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.task_date) searchParams.set("task_date", params.task_date);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.has_error !== undefined) searchParams.set("has_error", params.has_error.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const response = await http.get<OcrResultListResponse>(`ocr-results?${searchParams}`);
    return response;
  },

  /**
   * OCR結果詳細取得
   */
  get: async (id: number): Promise<OcrResultItem> => {
    const response = await http.get<OcrResultItem>(`ocr-results/${id}`);
    return response;
  },

  /**
   * OCR結果のExcelエクスポート
   */
  exportExcel: async (params?: {
    task_date?: string;
    status?: string;
    has_error?: boolean;
  }): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (params?.task_date) searchParams.set("task_date", params.task_date);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.has_error !== undefined) {
      searchParams.set("has_error", params.has_error.toString());
    }

    const url = `ocr-results/export/download?format=xlsx&${searchParams}`;
    const filename = `OCR結果_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await http.download(url, filename);
  },
};
