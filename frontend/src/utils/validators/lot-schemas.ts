/**
 * Zod Validation Schemas - Lot
 * ロット関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * ロット作成用スキーマ
 */
export const lotCreateSchema = z.object({
  product_code: z.string().min(1, "先方品番は必須です"),
  supplier_code: z.string().min(1, "仕入先コードは必須です"),
  lot_number: z.string().min(1, "ロット番号は必須です"),
  receipt_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "有効な日付を入力してください"),
  expiry_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "有効な日付を入力してください")
    .nullable()
    .optional(),
  delivery_place_code: z.string().nullable().optional(),
  initial_quantity: z.number().min(0, "数量は0以上である必要があります").optional(),
});

/**
 * ロット更新用スキーマ
 */
export const lotUpdateSchema = z.object({
  expiry_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "有効な日付を入力してください")
    .nullable()
    .optional(),
  delivery_place_code: z.string().nullable().optional(),
});

/**
 * ロット検索用スキーマ
 */
export const lotSearchSchema = z.object({
  product_code: z.string().optional(),
  supplier_code: z.string().optional(),
  lot_number: z.string().optional(),
  delivery_place_code: z.string().optional(),
  has_stock: z.boolean().optional(),
  skip: z.number().min(0).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Minimal lot schema type shims for compile
export type LotCreate = {
  supplier_code: string;
  product_code: string;
  lot_number: string;
  receipt_date: string;
  delivery_place_code?: string | null;
  expiry_date?: string | null;
  quantity?: number;
};

export type LotUpdate = Partial<LotCreate>;

export type LotWithStock = {
  id: number;
  product_code: string;
  lot_number: string;
  current_quantity?: number | null;
  status?: string | null;
};

/**
 * 型推論
 */
export type LotCreateInput = z.infer<typeof lotCreateSchema>;
export type LotUpdateInput = z.infer<typeof lotUpdateSchema>;
export type LotSearchParams = z.infer<typeof lotSearchSchema>;
