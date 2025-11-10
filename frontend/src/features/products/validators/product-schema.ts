/**
 * Zod Validation Schemas - Products
 * 製品関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 製品スキーマ
 */
export const productSchema = z.object({
  product_code: z.string().min(1, "製品コードは必須です"),
  product_name: z.string().min(1, "製品名は必須です"),
  unit: z.string().optional(),
  category: z.string().optional(),
});

// Minimal master schema type shims for compile
export type Product = {
  product_code: string;
  product_name: string;
  packaging_qty?: string;
  packaging_unit?: string;
  internal_unit?: string;
  customer_part_no?: string | null;
  maker_part_no?: string | null;
  requires_lot_number?: boolean;
};

/**
 * 型推論
 */
export type ProductInput = z.infer<typeof productSchema>;
