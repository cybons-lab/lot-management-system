/**
 * UserForm (v2.2 - Phase G-2)
 * Form component for creating users
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateUserRequest } from "../api";

interface UserFormProps {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function UserForm({ onSubmit, onCancel, isSubmitting = false }: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: "",
    email: "",
    display_name: "",
    password: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username || formData.username.trim().length < 3) {
      newErrors.username = "ユーザー名は3文字以上で入力してください";
    }

    if (!formData.email || !formData.email.includes("@")) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }

    if (!formData.display_name || formData.display_name.trim() === "") {
      newErrors.display_name = "表示名を入力してください";
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "パスワードは8文字以上で入力してください";
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
      {/* Username */}
      <div>
        <Label htmlFor="username" className="mb-2 block text-sm font-medium">
          ユーザー名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="ユーザー名を入力（3文字以上）"
          disabled={isSubmitting}
          maxLength={50}
        />
        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2 block text-sm font-medium">
          メールアドレス <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="メールアドレスを入力"
          disabled={isSubmitting}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Display Name */}
      <div>
        <Label htmlFor="display_name" className="mb-2 block text-sm font-medium">
          表示名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="display_name"
          type="text"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder="表示名を入力"
          disabled={isSubmitting}
          maxLength={100}
        />
        {errors.display_name && <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>}
      </div>

      {/* Password */}
      <div>
        <Label htmlFor="password" className="mb-2 block text-sm font-medium">
          パスワード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="パスワードを入力（8文字以上）"
          disabled={isSubmitting}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        <p className="mt-1 text-xs text-gray-500">8文字以上で入力してください</p>
      </div>

      {/* Is Active */}
      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          disabled={isSubmitting}
          className="h-4 w-4 rounded border-gray-300"
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
