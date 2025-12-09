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

export interface WithdrawalCreateRequest {
  lot_id: number;
  quantity: number;
  withdrawal_type: WithdrawalType;
  customer_id: number;
  delivery_place_id: number;
  ship_date: string; // YYYY-MM-DD
  reason?: string;
  reference_number?: string;
  withdrawn_by: number;
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
}

// ============ API Functions ============

const BASE_PATH = "withdrawals";

/**
 * 出庫履歴一覧を取得
 */
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
