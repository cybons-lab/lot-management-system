/**
 * Customer form validation schema
 */

import { z } from "zod";

export const customerFormSchema = z.object({
  customer_code: z
    .string()
    .min(1, "得意先コードは必須です")
    .max(50, "得意先コードは50文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "得意先コードは英数字、ハイフン、アンダースコアのみ使用可能です"),
  customer_name: z
    .string()
    .min(1, "得意先名は必須です")
    .max(200, "得意先名は200文字以内で入力してください"),
  address: z.string().max(500, "住所は500文字以内で入力してください").optional().or(z.literal("")),
  contact_name: z
    .string()
    .max(100, "担当者名は100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50, "電話番号は50文字以内で入力してください").optional().or(z.literal("")),
  email: z
    .string()
    .max(200, "メールアドレスは200文字以内で入力してください")
    .email("有効なメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;
