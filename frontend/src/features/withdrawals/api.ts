/**
 * Withdrawal API types and functions
 *
 * 出庫（受注外出庫）のAPI型定義と関数
 */

import { http } from "@/shared/api/http-client";

// ============ Types ============

export type WithdrawalType =
  | "order_manual"
  | "internal_use"
  | "disposal"
  | "return"
  | "sample"
  | "other";

export const WITHDRAWAL_TYPE_LABELS: Record<WithdrawalType, string> = {
  order_manual: "受注（手動）",
  internal_use: "社内使用",
  disposal: "廃棄処理",
  return: "返品対応",
  sample: "サンプル出荷",
  other: "その他",
};

export const WITHDRAWAL_TYPES: Array<{ value: WithdrawalType; label: string }> = [
  { value: "order_manual", label: "受注（手動）" },
  { value: "internal_use", label: "社内使用" },
  { value: "disposal", label: "廃棄処理" },
  { value: "return", label: "返品対応" },
  { value: "sample", label: "サンプル出荷" },
  { value: "other", label: "その他" },
];

// ============ Cancel Types ============

export type WithdrawalCancelReason =
  | "input_error"
  | "wrong_quantity"
  | "wrong_lot"
  | "wrong_product"
  | "customer_request"
  | "duplicate"
  | "other";

export const CANCEL_REASON_LABELS: Record<WithdrawalCancelReason, string> = {
  input_error: "入力ミス",
  wrong_quantity: "数量誤り",
  wrong_lot: "ロット選択誤り",
  wrong_product: "品目誤り",
  customer_request: "顧客都合",
  duplicate: "重複登録",
  other: "その他",
};

export const CANCEL_REASONS: Array<{ value: WithdrawalCancelReason; label: string }> = [
  { value: "input_error", label: "入力ミス" },
  { value: "wrong_quantity", label: "数量誤り" },
  { value: "wrong_lot", label: "ロット選択誤り" },
  { value: "wrong_product", label: "品目誤り" },
  { value: "customer_request", label: "顧客都合" },
  { value: "duplicate", label: "重複登録" },
  { value: "other", label: "その他" },
];

export interface WithdrawalCreateRequest {
  lot_id: number;
  quantity: number;
  withdrawal_type: WithdrawalType;
  customer_id?: number; // Required only for order_manual
  delivery_place_id?: number; // Optional
  ship_date: string; // YYYY-MM-DD
  reason?: string;
  reference_number?: string;
  withdrawn_by?: number;
}

export interface WithdrawalCancelRequest {
  reason: WithdrawalCancelReason;
  note?: string | null;
  cancelled_by?: number | null;
}

export interface WithdrawalResponse {
  withdrawal_id: number;
  lot_id: number;
  lot_number: string;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: string; // Decimal as string
  withdrawal_type: WithdrawalType;
  withdrawal_type_label: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  delivery_place_id: number;
  delivery_place_name: string;
  delivery_place_code: string;
  ship_date: string;
  reason?: string | null;
  reference_number?: string | null;
  withdrawn_by: number;
  withdrawn_by_name?: string | null;
  withdrawn_at: string;
  created_at: string;
  // 取消関連フィールド
  is_cancelled: boolean;
  cancelled_at?: string | null;
  cancelled_by?: number | null;
  cancelled_by_name?: string | null;
  cancel_reason?: WithdrawalCancelReason | null;
  cancel_reason_label?: string | null;
  cancel_note?: string | null;
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface WithdrawalListParams {
  skip?: number;
  limit?: number;
  lot_id?: number;
  customer_id?: number;
  withdrawal_type?: WithdrawalType;
  start_date?: string;
  end_date?: string;
  product_id?: number;
  warehouse_id?: number;
  search?: string;
}

// ============ API Functions ============

const BASE_PATH = "withdrawals";

/**
 * 出庫履歴一覧を取得
 */
// eslint-disable-next-line complexity
export async function getWithdrawals(
  params?: WithdrawalListParams,
): Promise<WithdrawalListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.lot_id !== undefined) searchParams.set("lot_id", String(params.lot_id));
  if (params?.customer_id !== undefined)
    searchParams.set("customer_id", String(params.customer_id));
  if (params?.withdrawal_type) searchParams.set("withdrawal_type", params.withdrawal_type);
  if (params?.start_date) searchParams.set("start_date", params.start_date);
  if (params?.end_date) searchParams.set("end_date", params.end_date);
  if (params?.product_id !== undefined) searchParams.set("product_id", String(params.product_id));
  if (params?.warehouse_id !== undefined)
    searchParams.set("warehouse_id", String(params.warehouse_id));
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = query ? `${BASE_PATH}?${query}` : BASE_PATH;

  return http.get<WithdrawalListResponse>(url);
}

/**
 * 出庫詳細を取得
 */
export async function getWithdrawal(withdrawalId: number): Promise<WithdrawalResponse> {
  return http.get<WithdrawalResponse>(`${BASE_PATH}/${withdrawalId}`);
}

/**
 * 出庫を登録
 */
export async function createWithdrawal(data: WithdrawalCreateRequest): Promise<WithdrawalResponse> {
  return http.post<WithdrawalResponse>(BASE_PATH, data);
}

/**
 * 出庫を取消（反対仕訳方式）
 */
export async function cancelWithdrawal(
  withdrawalId: number,
  data: WithdrawalCancelRequest,
): Promise<WithdrawalResponse> {
  return http.post<WithdrawalResponse>(`${BASE_PATH}/${withdrawalId}/cancel`, data);
}
