/**
 * ProductForm - 商品新規登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import type { Product, ProductCreate } from "../api/products-api";
import { form as formStyles } from "../pages/styles";

import { Button, Input, Label } from "@/components/ui";

const productFormSchema = z.object({
  product_code: z.string().min(1, "製品コードは必須です").max(50),
  product_name: z.string().min(1, "商品名は必須です").max(200),
  internal_unit: z.string().min(1, "社内単位は必須です").max(20),
  external_unit: z.string().min(1, "外部単位は必須です").max(20),
  qty_per_internal_unit: z.coerce.number().positive("数量は1以上で入力してください"),
  customer_part_no: z.string().optional(),
  maker_item_code: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export type ProductFormOutput = ProductCreate;

export interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormOutput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const isEditMode = !!product;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormData>,
    defaultValues: {
      product_code: product?.product_code ?? "",
      product_name: product?.product_name ?? "",
      internal_unit: product?.internal_unit ?? "CAN",
      external_unit: product?.external_unit ?? "KG",
      qty_per_internal_unit: product?.qty_per_internal_unit ?? 1,
      customer_part_no: product?.customer_part_no ?? "",
      maker_item_code: product?.maker_item_code ?? "",
      is_active: product?.is_active ?? true,
    },
  });

  const handleFormSubmit = (data: ProductFormData) => {
    const output: ProductFormOutput = {
      product_code: data.product_code,
      product_name: data.product_name,
      internal_unit: data.internal_unit,
      external_unit: data.external_unit,
      qty_per_internal_unit: data.qty_per_internal_unit,
      customer_part_no: data.customer_part_no?.trim() ? data.customer_part_no : null,
      maker_item_code: data.maker_item_code?.trim() ? data.maker_item_code : null,
      is_active: data.is_active,
    };
    onSubmit(output);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={formStyles.grid}>
      <div className={formStyles.field}>
        <Label htmlFor="product_code" className={formStyles.label}>
          製品コード <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product_code"
          {...register("product_code")}
          placeholder="例: PROD-001"
          disabled={isEditMode}
          className={formStyles.input}
        />
        {errors.product_code && <p className={formStyles.error}>{errors.product_code.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="product_name" className={formStyles.label}>
          商品名 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product_name"
          {...register("product_name")}
          placeholder="例: サンプル商品"
          className={formStyles.input}
        />
        {errors.product_name && <p className={formStyles.error}>{errors.product_name.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="internal_unit" className={formStyles.label}>
          社内単位 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="internal_unit"
          {...register("internal_unit")}
          placeholder="例: CAN"
          className={formStyles.input}
        />
        {errors.internal_unit && <p className={formStyles.error}>{errors.internal_unit.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="external_unit" className={formStyles.label}>
          外部単位 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="external_unit"
          {...register("external_unit")}
          placeholder="例: KG"
          className={formStyles.input}
        />
        {errors.external_unit && <p className={formStyles.error}>{errors.external_unit.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="qty_per_internal_unit" className={formStyles.label}>
          内部単位あたりの数量 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="qty_per_internal_unit"
          type="number"
          step="0.001"
          {...register("qty_per_internal_unit")}
          placeholder="例: 1"
          className={formStyles.input}
        />
        {errors.qty_per_internal_unit && (
          <p className={formStyles.error}>{errors.qty_per_internal_unit.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="customer_part_no" className={formStyles.label}>
          得意先品番
        </Label>
        <Input
          id="customer_part_no"
          {...register("customer_part_no")}
          placeholder="例: CUST-001"
          className={formStyles.input}
        />
        {errors.customer_part_no && (
          <p className={formStyles.error}>{errors.customer_part_no.message}</p>
        )}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="maker_item_code" className={formStyles.label}>
          メーカー品番
        </Label>
        <Input
          id="maker_item_code"
          {...register("maker_item_code")}
          placeholder="例: MAKER-001"
          className={formStyles.input}
        />
        {errors.maker_item_code && (
          <p className={formStyles.error}>{errors.maker_item_code.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          id="is_active"
          type="checkbox"
          {...register("is_active")}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
        <Label htmlFor="is_active" className={formStyles.label}>
          有効
        </Label>
        <span className="text-sm text-gray-500">{watch("is_active") ? "有効" : "無効"}</span>
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
