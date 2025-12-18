/**
 * AdhocLotCreateForm validation schema
 *
 * 入庫登録（アドホックロット作成）フォームのバリデーションスキーマ
 */

import { z } from "zod";

/**
 * ロット起点タイプ（アドホック画面で選択可能な値のみ）
 */
export const ADHOC_ORIGIN_TYPES = [
  { value: "sample", label: "サンプル" },
  { value: "safety_stock", label: "安全在庫" },
  { value: "adhoc", label: "その他" },
] as const;

export type AdhocOriginType = (typeof ADHOC_ORIGIN_TYPES)[number]["value"];

/**
 * 入庫登録フォームのスキーマ
 */
export const adhocLotCreateSchema = z.object({
  lot_number: z.string().min(1, "ロット番号を入力してください"),
  product_id: z.string().min(1, "製品を選択してください"),
  warehouse_id: z.string().min(1, "倉庫を選択してください"),
  supplier_code: z.string().optional(),
  current_quantity: z
    .string()
    .min(1, "数量を入力してください")
    .refine((val) => Number(val) > 0, "数量は1以上を入力してください"),
  unit: z.string().min(1, "単位を入力してください"),
  received_date: z.string().min(1, "入荷日を入力してください"),
  expiry_date: z.string().optional(),
  origin_type: z.custom<AdhocOriginType>((val) => typeof val === "string", {
    message: "ロット種別を選択してください",
  }),
  origin_reference: z.string().optional(),
});

export type AdhocLotFormData = z.infer<typeof adhocLotCreateSchema>;

/**
 * フォームの初期値
 */
export const ADHOC_LOT_FORM_DEFAULTS: AdhocLotFormData = {
  lot_number: "",
  product_id: "",
  warehouse_id: "",
  supplier_code: "none",
  current_quantity: "",
  unit: "EA",
  received_date: new Date().toISOString().split("T")[0],
  expiry_date: "",
  origin_type: "adhoc",
  origin_reference: "",
};
