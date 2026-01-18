/**
 * WithdrawalForm validation schema
 *
 * 出庫登録フォームのバリデーションスキーマ
 */

import { z } from "zod";

import type { WithdrawalType } from "../api";

/**
 * 出庫登録フォームのスキーマ
 */
export const withdrawalFormSchema = z.object({
  lot_id: z.number().min(1, "ロットを選択してください"),
  quantity: z
    .number()
    .min(0.001, "出庫数量を入力してください")
    .refine((val) => val > 0, "出庫数量は1以上を入力してください"),
  withdrawal_type: z.custom<WithdrawalType>((val) => typeof val === "string", {
    message: "出庫タイプを選択してください",
  }),
  customer_id: z.number().min(1, "得意先を選択してください"),
  delivery_place_id: z.number().min(1, "納入場所を選択してください"),
  ship_date: z.string().optional(),
  due_date: z.string().min(1, "納期を入力してください"),
  reason: z.string().optional(),
  reference_number: z.string().optional(),
});

export type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;

/**
 * フォームの初期値
 */
export const WITHDRAWAL_FORM_DEFAULTS: WithdrawalFormData = {
  lot_id: 0,
  quantity: 0,
  withdrawal_type: "order_manual",
  customer_id: 0,
  delivery_place_id: 0,
  ship_date: "",
  due_date: new Date().toISOString().split("T")[0],
  reason: "",
  reference_number: "",
};
