/**
 * RoleForm スキーマ
 * Zod バリデーションスキーマ
 */

import { z } from "zod";

export const roleFormSchema = z.object({
  role_code: z.string().min(1, "ロールコードを入力してください"),
  role_name: z.string().min(1, "ロール名を入力してください"),
  description: z.string().nullable(),
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

export const ROLE_FORM_DEFAULTS: RoleFormData = {
  role_code: "",
  role_name: "",
  description: null,
};
