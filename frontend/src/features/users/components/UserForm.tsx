/**
 * UserForm (v2.3 - react-hook-form + Zod)
 * Form component for creating users
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";

import type { CreateUserRequest } from "../api";

import { userFormSchema, type UserFormData, USER_FORM_DEFAULTS } from "./userFormSchema";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

interface UserFormProps {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function UserForm({ onSubmit, onCancel, isSubmitting = false }: UserFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: USER_FORM_DEFAULTS,
  });

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data as CreateUserRequest);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Username */}
      <div>
        <Label htmlFor="username" className="mb-2 block text-sm font-medium">
          ユーザー名 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="username"
              type="text"
              placeholder="ユーザー名を入力（3文字以上）"
              disabled={isSubmitting}
              maxLength={50}
            />
          )}
        />
        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
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
              type="text"
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

      {/* Password */}
      <div>
        <Label htmlFor="password" className="mb-2 block text-sm font-medium">
          パスワード <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="password"
              type="password"
              placeholder="パスワードを入力（8文字以上）"
              disabled={isSubmitting}
            />
          )}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        <p className="mt-1 text-xs text-gray-500">8文字以上で入力してください</p>
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
          有効なユーザーとして作成
        </Label>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}
