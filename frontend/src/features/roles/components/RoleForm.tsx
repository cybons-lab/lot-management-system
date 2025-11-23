/**
 * RoleForm (v2.2 - Phase G-2)
 * Form component for creating roles
 */

import { useState } from "react";

import type { CreateRoleRequest } from "../api";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";

interface RoleFormProps {
  onSubmit: (data: CreateRoleRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RoleForm({ onSubmit, onCancel, isSubmitting = false }: RoleFormProps) {
  const [formData, setFormData] = useState<CreateRoleRequest>({
    role_code: "",
    role_name: "",
    description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.role_code || formData.role_code.trim() === "") {
      newErrors.role_code = "ロールコードを入力してください";
    }

    if (!formData.role_name || formData.role_name.trim() === "") {
      newErrors.role_name = "ロール名を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role Code */}
      <div>
        <Label htmlFor="role_code" className="mb-2 block text-sm font-medium">
          ロールコード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="role_code"
          type="text"
          value={formData.role_code}
          onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
          placeholder="ロールコードを入力（例: ADMIN, USER, MANAGER）"
          disabled={isSubmitting}
          maxLength={50}
        />
        {errors.role_code && <p className="mt-1 text-sm text-red-600">{errors.role_code}</p>}
        <p className="mt-1 text-xs text-gray-500">一意の識別子として使用されます（大文字推奨）</p>
      </div>

      {/* Role Name */}
      <div>
        <Label htmlFor="role_name" className="mb-2 block text-sm font-medium">
          ロール名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="role_name"
          type="text"
          value={formData.role_name}
          onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
          placeholder="ロール名を入力（例: 管理者、一般ユーザー）"
          disabled={isSubmitting}
          maxLength={100}
        />
        {errors.role_name && <p className="mt-1 text-sm text-red-600">{errors.role_name}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="mb-2 block text-sm font-medium">
          説明
        </Label>
        <textarea
          id="description"
          value={formData.description ?? ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
          placeholder="ロールの説明を入力（オプション）"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          disabled={isSubmitting}
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
