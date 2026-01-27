/**
 * CustomerItemForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const customerItemFormSchema = z.object({
  customer_id: z.number().min(1, "得意先を選択してください"),
  customer_part_no: z.string().min(1, "得意先品番を入力してください"),
  product_id: z.number().nullable(), // Phase1: オプション（Phase2用グルーピング）
  supplier_id: z.number().nullable(), // 非推奨（supplier_item_id経由で取得）
  supplier_item_id: z.number().min(1, "メーカー品番を選択してください"), // Phase1: 必須
  is_primary: z.boolean(),
  base_unit: z.string().min(1, "基本単位を入力してください"),
  pack_unit: z.string().nullable(),
  pack_quantity: z.number().nullable(),
  special_instructions: z.string().nullable(),
});

export type CustomerItemFormData = z.infer<typeof customerItemFormSchema>;

export const CUSTOMER_ITEM_FORM_DEFAULTS: CustomerItemFormData = {
  customer_id: 0,
  customer_part_no: "",
  product_id: null, // Phase1: デフォルトnull
  supplier_id: null,
  supplier_item_id: 0, // Phase1: 必須なので0（未選択）
  is_primary: false,
  base_unit: "EA",
  pack_unit: null,
  pack_quantity: null,
  special_instructions: null,
};
