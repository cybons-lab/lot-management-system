/**
 * CustomerItemForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const customerItemFormSchema = z.object({
  customer_id: z.number().min(1, "得意先を選択してください"),
  customer_part_no: z.string().min(1, "得意先品番を入力してください"),
  product_group_id: z.number().min(1, "メーカー品番を選択してください"),
  base_unit: z.string().min(1, "基本単位を入力してください"),
  pack_unit: z.string().nullable(),
  pack_quantity: z.number().nullable(),
  special_instructions: z.string().nullable(),
});

export type CustomerItemFormData = z.infer<typeof customerItemFormSchema>;

export const CUSTOMER_ITEM_FORM_DEFAULTS: CustomerItemFormData = {
  customer_id: 0,
  customer_part_no: "",
  product_group_id: 0,
  base_unit: "EA",
  pack_unit: null,
  pack_quantity: null,
  special_instructions: null,
};
