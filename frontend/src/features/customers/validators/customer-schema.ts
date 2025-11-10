/**
 * Zod Validation Schemas - Customers
 * 得意先関連のバリデーションスキーマ
 */

import { z } from "zod";

/**
 * 得意先スキーマ
 */
export const customerSchema = z.object({
  customer_code: z.string().min(1, "得意先コードは必須です"),
  customer_name: z.string().min(1, "得意先名は必須です"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

export type Customer = {
  customer_code: string;
  customer_name?: string;
  address?: string | null;
};

/**
 * 型推論
 */
export type CustomerInput = z.infer<typeof customerSchema>;
