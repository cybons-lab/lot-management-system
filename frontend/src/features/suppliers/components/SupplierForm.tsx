/**
 * SupplierForm - 仕入先新規登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegister } from "react-hook-form";
import { z } from "zod";

import type { Supplier } from "../api";
import { form as formStyles } from "../pages/styles";

import { Button, Input, Label } from "@/components/ui";

const supplierFormSchema = z.object({
  supplier_code: z.string().min(1, "仕入先コードは必須です").max(50),
  supplier_name: z.string().min(1, "仕入先名は必須です").max(200),
  short_name: z
    .string()
    .max(50, "短縮名は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

export interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface SupplierInputFieldProps {
  id: keyof SupplierFormData;
  label: string;
  placeholder: string;
  required?: boolean;
  register: UseFormRegister<SupplierFormData>;
  error?: string;
}

function SupplierInputField({
  id,
  label,
  placeholder,
  required = false,
  register,
  error,
}: SupplierInputFieldProps) {
  return (
    <div className={formStyles.field}>
      <Label htmlFor={id} className={formStyles.label}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input id={id} {...register(id)} placeholder={placeholder} className={formStyles.input} />
      {error && <p className={formStyles.error}>{error}</p>}
    </div>
  );
}

function getSubmitLabel(isSubmitting: boolean, isEditMode: boolean) {
  if (isSubmitting) return "保存中...";
  return isEditMode ? "更新" : "登録";
}

export function SupplierForm({
  supplier,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SupplierFormProps) {
  const isEditMode = !!supplier;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      supplier_code: supplier?.supplier_code ?? "",
      supplier_name: supplier?.supplier_name ?? "",
      short_name: supplier?.short_name ?? "",
    },
  });

  const submitLabel = getSubmitLabel(isSubmitting, isEditMode);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      <SupplierInputField
        id="supplier_code"
        label="仕入先コード"
        placeholder="例: SUP-001"
        required
        register={register}
        error={errors.supplier_code?.message}
      />

      <SupplierInputField
        id="supplier_name"
        label="仕入先名"
        placeholder="例: サンプル商社"
        required
        register={register}
        error={errors.supplier_name?.message}
      />

      <SupplierInputField
        id="short_name"
        label="短縮名"
        placeholder="例: サンプル"
        register={register}
        error={errors.short_name?.message}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
