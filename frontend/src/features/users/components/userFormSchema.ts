/**
 * UserForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const userFormSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  display_name: z.string().min(1, "表示名を入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  is_active: z.boolean(),
});

export type UserFormData = z.infer<typeof userFormSchema>;

export const USER_FORM_DEFAULTS: UserFormData = {
  username: "",
  email: "",
  display_name: "",
  password: "",
  is_active: true,
};
