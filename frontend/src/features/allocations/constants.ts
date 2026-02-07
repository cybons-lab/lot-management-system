import type { ReservationCancelReason } from "./types";

export const RESERVATION_CANCEL_REASON_LABELS: Record<ReservationCancelReason, string> = {
  input_error: "入力ミス",
  wrong_quantity: "数量誤り",
  wrong_lot: "ロット選択誤り",
  wrong_product: "品目誤り",
  customer_request: "顧客都合",
  duplicate: "重複登録",
  other: "その他",
};

export const RESERVATION_CANCEL_REASONS: { value: ReservationCancelReason; label: string }[] = [
  { value: "input_error", label: "入力ミス" },
  { value: "wrong_quantity", label: "数量誤り" },
  { value: "wrong_lot", label: "ロット選択誤り" },
  { value: "wrong_product", label: "品目誤り" },
  { value: "customer_request", label: "顧客都合" },
  { value: "duplicate", label: "重複登録" },
  { value: "other", label: "その他" },
];
export const ALLOCATION_CONSTANTS = {
  CANDIDATE_LOTS_LIMIT: 50,
  DEFAULT_STRATEGY: "fefo",
  QUERY_STRATEGY: {
    FEFO: "fefo",
  },
  LINE_STATUS: {
    CLEAN: "clean",
    DRAFT: "draft",
    COMMITTED: "committed",
  },
  MESSAGES: {
    SAVE_SUCCESS: "引当を保存しました",
    OVER_ALLOCATED: "受注数量を超えて引当てることはできません",
    CANCEL_SUCCESS: "引当を取り消しました",
  },
} as const;
