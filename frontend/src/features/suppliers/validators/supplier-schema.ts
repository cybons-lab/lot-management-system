/**
 * Zod Validation Schemas - Suppliers
 * 仕入先関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 仕入先スキーマ
 */
export const supplierSchema = z.object({
  supplier_code: z.string().min(1, "仕入先コードは必須です"),
  supplier_name: z.string().min(1, "仕入先名は必須です"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

export type Supplier = {
  supplier_code: string;
  supplier_name: string;
  address?: string | null;
};

/**
 * 型推論
 */
export type SupplierInput = z.infer<typeof supplierSchema>;
