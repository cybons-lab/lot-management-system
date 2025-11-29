/**
 * CustomerForm
 * 得意先の新規登録/編集フォーム
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Customer } from "../api";
import { form as formStyles } from "../pages/styles";

import { Button, Input, Label } from "@/components/ui";

// ============================================
// バリデーションスキーマ
// ============================================

const customerFormSchema = z.object({
  customer_code: z
    .string()
    .min(1, "得意先コードは必須です")
    .max(50, "得意先コードは50文字以内で入力してください")
    .regex(/^[A-Za-z0-9_-]+$/, "得意先コードは英数字、ハイフン、アンダースコアのみ使用可能です"),
  customer_name: z
    .string()
    .min(1, "得意先名は必須です")
    .max(200, "得意先名は200文字以内で入力してください"),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

// ============================================
// Props
// ============================================

export interface CustomerFormProps {
  /** 編集モードの場合、既存の得意先データ */
  customer?: Customer;
  /** フォーム送信時のコールバック */
  onSubmit: (data: CustomerFormData) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** 送信中フラグ */
  isSubmitting?: boolean;
}

// ============================================
// Component
// ============================================

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CustomerFormProps) {
  const isEditMode = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customer_code: customer?.customer_code ?? "",
      customer_name: customer?.customer_name ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      {/* 得意先コード */}
      <div className={formStyles.field}>
        <Label htmlFor="customer_code" className={formStyles.label}>
          得意先コード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="customer_code"
          {...register("customer_code")}
          placeholder="例: CUST-001"
          disabled={isEditMode}
          className={formStyles.input}
        />
        {errors.customer_code && <p className={formStyles.error}>{errors.customer_code.message}</p>}
        {isEditMode && <p className="text-xs text-gray-500">得意先コードは変更できません</p>}
      </div>

      {/* 得意先名 */}
      <div className={formStyles.field}>
        <Label htmlFor="customer_name" className={formStyles.label}>
          得意先名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="customer_name"
          {...register("customer_name")}
          placeholder="例: 株式会社サンプル"
          className={formStyles.input}
        />
        {errors.customer_name && <p className={formStyles.error}>{errors.customer_name.message}</p>}
      </div>

      {/* TODO: backend: 追加フィールド（contact_name, phone, email等）は
          バックエンドスキーマ確定後に追加 */}

      {/* ボタン */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : isEditMode ? "更新" : "登録"}
        </Button>
      </div>
    </form>
  );
}
