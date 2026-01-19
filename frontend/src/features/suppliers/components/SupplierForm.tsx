/**
 * SupplierForm - 仕入先新規登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

// eslint-disable-next-line complexity
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formStyles.grid}>
      <div className={formStyles.field}>
        <Label htmlFor="supplier_code" className={formStyles.label}>
          仕入先コード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="supplier_code"
          {...register("supplier_code")}
          placeholder="例: SUP-001"
          className={formStyles.input}
        />
        {errors.supplier_code && <p className={formStyles.error}>{errors.supplier_code.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="supplier_name" className={formStyles.label}>
          仕入先名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="supplier_name"
          {...register("supplier_name")}
          placeholder="例: サンプル商社"
          className={formStyles.input}
        />
        {errors.supplier_name && <p className={formStyles.error}>{errors.supplier_name.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="short_name" className={formStyles.label}>
          短縮名
        </Label>
        <Input
          id="short_name"
          {...register("short_name")}
          placeholder="例: サンプル"
          className={formStyles.input}
        />
        {errors.short_name && <p className={formStyles.error}>{errors.short_name.message}</p>}
      </div>

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
