/**
 * RoleForm (v2.3 - react-hook-form + Zod)
 * Form component for creating roles
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";

import type { CreateRoleRequest } from "../api";

import { roleFormSchema, type RoleFormData, ROLE_FORM_DEFAULTS } from "./roleFormSchema";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

interface RoleFormProps {
  onSubmit: (data: CreateRoleRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RoleForm({ onSubmit, onCancel, isSubmitting = false }: RoleFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: ROLE_FORM_DEFAULTS,
  });

  const handleFormSubmit = (data: RoleFormData) => {
    onSubmit(data as CreateRoleRequest);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Role Code */}
      <div>
        <Label htmlFor="role_code" className="mb-2 block text-sm font-medium">
          ロールコード <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="role_code"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="role_code"
              type="text"
              placeholder="ロールコードを入力（例: ADMIN, USER, MANAGER）"
              disabled={isSubmitting}
              maxLength={50}
            />
          )}
        />
        {errors.role_code && (
          <p className="mt-1 text-sm text-red-600">{errors.role_code.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">一意の識別子として使用されます（大文字推奨）</p>
      </div>

      {/* Role Name */}
      <div>
        <Label htmlFor="role_name" className="mb-2 block text-sm font-medium">
          ロール名 <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="role_name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="role_name"
              type="text"
              placeholder="ロール名を入力（例: 管理者、一般ユーザー）"
              disabled={isSubmitting}
              maxLength={100}
            />
          )}
        />
        {errors.role_name && (
          <p className="mt-1 text-sm text-red-600">{errors.role_name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="mb-2 block text-sm font-medium">
          説明
        </Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <textarea
              id="description"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
              placeholder="ロールの説明を入力（オプション）"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          )}
        />
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
