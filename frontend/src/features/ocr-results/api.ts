/**
 * OCR結果データ API client (v_ocr_resultsビューベース)
 */

import { httpAuth } from "@/shared/api/http-client";

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
  lot_no_1: string | null;
  quantity_1: string | null;
  lot_no_2: string | null;
  quantity_2: string | null;

  // 手入力結果
  manual_lot_no_1: string | null;
  manual_quantity_1: string | null;
  manual_lot_no_2: string | null;
  manual_quantity_2: string | null;
  manual_inbound_no: string | null;
  manual_inbound_no_2: string | null;
  manual_shipping_date: string | null;
  manual_shipping_slip_text: string | null;
  manual_shipping_slip_text_edited: boolean | null;
  manual_jiku_code: string | null;
  manual_material_code: string | null;
  manual_delivery_quantity: string | null;
  manual_updated_at: string | null;

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

  // SAP照合結果
  sap_match_type: string | null;
  sap_matched_zkdmat_b: string | null;
  sap_supplier_code: string | null;
  sap_supplier_name: string | null;
  sap_qty_unit: string | null;
  sap_maker_item: string | null;

  // 処理ステータス: pending/downloaded/sap_linked/completed
  process_status: string;
  error_flags: Record<string, boolean>;

  // 計算結果
  calculated_shipping_date: string | null;
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

export interface OcrResultEditPayload {
  lot_no_1?: string | null;
  quantity_1?: string | null;
  lot_no_2?: string | null;
  quantity_2?: string | null;
  inbound_no?: string | null;
  inbound_no_2?: string | null;
  shipping_date?: string | null;
  shipping_slip_text?: string | null;
  shipping_slip_text_edited?: boolean | null;
  jiku_code?: string | null;
  material_code?: string | null;
  delivery_quantity?: string | null;
  delivery_date?: string | null;
  process_status?: string | null;
  error_flags?: Record<string, boolean> | null;
}

export interface OcrResultEditResponse {
  id: number;
  smartread_long_data_id: number;
  lot_no_1: string | null;
  quantity_1: string | null;
  lot_no_2: string | null;
  quantity_2: string | null;
  inbound_no: string | null;
  inbound_no_2: string | null;
  shipping_date: string | null;
  shipping_slip_text: string | null;
  shipping_slip_text_edited: boolean;
  jiku_code: string | null;
  material_code: string | null;
  delivery_quantity: string | null;
  process_status: string;
  error_flags: Record<string, boolean>;
  updated_at: string;
}

export const ocrResultsApi = {
  /**
   * OCR結果一覧取得（v_ocr_resultsビューから）
   */
  list: async (params?: OcrResultListParams): Promise<OcrResultListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.task_date) searchParams.set("task_date", params.task_date);
      if (params.status) searchParams.set("status", params.status);
      if (params.has_error !== undefined) {
        searchParams.set("has_error", String(params.has_error));
      }
      if (typeof params.limit === "number") {
        searchParams.set("limit", String(params.limit));
      }
      if (typeof params.offset === "number") {
        searchParams.set("offset", String(params.offset));
      }
    }

    const response = await httpAuth.get<OcrResultListResponse>(
      `ocr-results?${searchParams.toString()}`,
    );
    return response;
  },

  /**
   * OCR結果詳細取得
   */
  get: async (id: number): Promise<OcrResultItem> => {
    const response = await httpAuth.get<OcrResultItem>(`ocr-results/${id}`);
    return response;
  },

  /**
   * OCR結果の手入力内容を保存
   */
  saveEdit: async (id: number, payload: OcrResultEditPayload): Promise<OcrResultEditResponse> => {
    const response = await httpAuth.post<OcrResultEditResponse>(`ocr-results/${id}/edit`, payload);
    return response;
  },

  /**
   * OCR結果のExcelエクスポート
   */
  exportExcel: async (params?: {
    task_date?: string;
    status?: string;
    has_error?: boolean;
    ids?: number[];
  }): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (params?.task_date) searchParams.set("task_date", params.task_date);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.has_error !== undefined) {
      searchParams.set("has_error", params.has_error.toString());
    }
    if (params?.ids?.length) {
      params.ids.forEach((id) => searchParams.append("ids", id.toString()));
    }

    const url = `ocr-results/export/download?format=xlsx&${searchParams}`;
    const filename = `OCR結果_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await httpAuth.download(url, filename);
  },

  /**
   * OCR結果を完了としてマーク（アーカイブ）
   */
  complete: async (ids: number[]): Promise<void> => {
    await httpAuth.post("ocr-results/complete", { ids });
  },

  /**
   * OCR結果を未処理に戻す（リストア）
   */
  restore: async (ids: number[]): Promise<void> => {
    await httpAuth.post("ocr-results/restore", { ids });
  },

  /**
   * 完了済み（アーカイブ）OCR結果一覧取得
   */
  listCompleted: async (params?: OcrResultListParams): Promise<OcrResultListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.task_date) searchParams.set("task_date", params.task_date);
      if (typeof params.limit === "number") {
        searchParams.set("limit", String(params.limit));
      }
      if (typeof params.offset === "number") {
        searchParams.set("offset", String(params.offset));
      }
    }

    const response = await httpAuth.get<OcrResultListResponse>(
      `ocr-results/completed?${searchParams.toString()}`,
    );
    return response;
  },
};
