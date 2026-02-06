/**
 * UserEditForm
 * ユーザー編集用フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import type { UpdateUserRequest, UserWithRoles } from "../api";

import { Button, Input, Label } from "@/components/ui";

// 編集用スキーマ
const userEditFormSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  display_name: z.string().min(1, "表示名を入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean(),
});

type UserEditFormData = z.infer<typeof userEditFormSchema>;

interface UserEditFormProps {
  user: UserWithRoles;
  onSubmit: (data: UpdateUserRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function UserEditForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UserEditFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      email: user.email,
      display_name: user.display_name,
      password: "",
      is_active: user.is_active,
    },
  });

  const handleFormSubmit = (data: UserEditFormData) => {
    const updateData: UpdateUserRequest = {
      email: data.email,
      display_name: data.display_name,
      is_active: data.is_active,
      password: data.password || undefined,
    };
    onSubmit(updateData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Username (Read Only) */}
      <div>
        <Label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">
          ユーザー名
        </Label>
        <Input id="username" value={user.username} disabled className="bg-gray-100" />
        <p className="mt-1 text-xs text-gray-500">ユーザー名は変更できません</p>
      </div>

      {/* Display Name */}
      <div>
        <Label htmlFor="display_name" className="mb-2 block text-sm font-medium">
          表示名 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="display_name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="display_name"
              placeholder="表示名を入力"
              disabled={isSubmitting}
              maxLength={100}
            />
          )}
        />
        {errors.display_name && (
          <p className="mt-1 text-sm text-red-600">{errors.display_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2 block text-sm font-medium">
          メールアドレス <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="email"
              type="email"
              placeholder="メールアドレスを入力"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      {/* Password (Optional) */}
      <div>
        <Label htmlFor="password" className="mb-2 block text-sm font-medium">
          パスワード
        </Label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="password"
              type="password"
              placeholder="変更する場合のみ入力（8文字以上）"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {/* Is Active */}
      <div className="flex items-center gap-2">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <input
              id="is_active"
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300"
            />
          )}
        />
        <Label htmlFor="is_active" className="text-sm font-medium">
          有効
        </Label>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "更新"}
        </Button>
      </div>
    </form>
  );
}
