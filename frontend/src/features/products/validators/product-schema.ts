/**
 * Zod Validation Schemas - Products
 * 商品関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 商品スキーマ
 */
export const productSchema = z.object({
  product_code: z.string().min(1, "先方品番は必須です"),
  product_name: z.string().min(1, "商品名は必須です"),
  unit: z.string().optional(),
  category: z.string().optional(),
});

// Minimal master schema type shims for compile
import type { components } from "@/types/api";

export type Product = components["schemas"]["ProductOut"];

/**
 * 型推論
 */
export type ProductInput = z.infer<typeof productSchema>;
