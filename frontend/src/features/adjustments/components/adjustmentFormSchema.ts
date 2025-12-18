/**
 * AdjustmentForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const ADJUSTMENT_TYPES = [
  { value: "physical_count", label: "実地棚卸" },
  { value: "damage", label: "破損" },
  { value: "loss", label: "紛失" },
  { value: "found", label: "発見" },
  { value: "other", label: "その他" },
] as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]["value"];

export const adjustmentFormSchema = z.object({
  lot_id: z.number().min(1, "ロットIDを入力してください"),
  adjustment_type: z.enum(["physical_count", "damage", "loss", "found", "other"]),
  adjusted_quantity: z.number().refine((val) => val !== 0, "調整数量を入力してください"),
  reason: z.string().min(1, "理由を入力してください"),
  adjusted_by: z.number(),
});

export type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>;

export const ADJUSTMENT_FORM_DEFAULTS: AdjustmentFormData = {
  lot_id: 0,
  adjustment_type: "physical_count",
  adjusted_quantity: 0,
  reason: "",
  adjusted_by: 1,
};
