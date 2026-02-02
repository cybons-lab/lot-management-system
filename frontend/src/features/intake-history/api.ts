/**
 * Intake History API types and functions
 *
 * 入庫履歴のAPI型定義と関数
 */

import { http } from "@/shared/api/http-client";

// ============ Types ============

export interface IntakeHistoryResponse {
  intake_id: number;
  lot_id: number;
  lot_number: string;
  supplier_item_id: number;
  product_name: string;
  product_code: string;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_code: string | null;
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string | null;
  quantity: string; // Decimal as string
  received_date: string; // YYYY-MM-DD
  expiry_date: string | null;
  inbound_plan_number: string | null;
  sap_po_number: string | null;
  transaction_date: string; // ISO datetime
  created_at: string;
}

export interface DailyIntakeSummary {
  date: string; // YYYY-MM-DD
  count: number;
  total_quantity: string; // Decimal string
}

export interface IntakeHistoryListResponse {
  intakes: IntakeHistoryResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface IntakeHistoryListParams {
  skip?: number;
  limit?: number;
  supplier_id?: number;
  warehouse_id?: number;
  supplier_item_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// ============ API Functions ============

const BASE_PATH = "intake-history";

/**
 * 入庫履歴一覧を取得
 */
export async function getIntakeHistory(
  params?: IntakeHistoryListParams,
): Promise<IntakeHistoryListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }

  const query = searchParams.toString();
  const url = query ? `${BASE_PATH}?${query}` : BASE_PATH;

  return http.get<IntakeHistoryListResponse>(url);
}

/**
 * 入庫履歴詳細を取得
 */
export async function getIntakeHistoryDetail(intakeId: number): Promise<IntakeHistoryResponse> {
  return http.get<IntakeHistoryResponse>(`${BASE_PATH}/${intakeId}`);
}

/**
 * 月間の日別入庫集計を取得（カレンダー用）
 */
export async function getIntakeCalendarSummary(params: {
  year: number;
  month: number;
  warehouse_id?: number;
  supplier_item_id?: number;
  supplier_id?: number;
}): Promise<DailyIntakeSummary[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("year", String(params.year));
  searchParams.set("month", String(params.month));
  if (params.warehouse_id !== undefined)
    searchParams.set("warehouse_id", String(params.warehouse_id));
  if (params.supplier_item_id !== undefined)
    searchParams.set("supplier_item_id", String(params.supplier_item_id));
  if (params.supplier_id !== undefined) searchParams.set("supplier_id", String(params.supplier_id));

  return http.get<DailyIntakeSummary[]>(`${BASE_PATH}/calendar-summary?${searchParams.toString()}`);
}
