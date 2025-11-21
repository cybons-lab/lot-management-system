/**
 * ProductForm - 商品新規登録/編集フォーム
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";
import type { Product } from "../api/products-api";
import { form as formStyles } from "../pages/styles";

const productFormSchema = z.object({
  maker_part_code: z.string().min(1, "メーカー品番は必須です").max(50),
  product_name: z.string().min(1, "商品名は必須です").max(200),
  base_unit: z.string().min(1, "単位は必須です").max(20),
  consumption_limit_days: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

// output型: APIへ送るデータ型
type ProductFormOutput = Omit<ProductFormData, "consumption_limit_days"> & {
  consumption_limit_days?: number | null;
};

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
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      maker_part_code: product?.maker_part_code ?? "",
      product_name: product?.product_name ?? "",
      base_unit: product?.base_unit ?? "EA",
      consumption_limit_days: product?.consumption_limit_days?.toString() ?? "",
    },
  });

  const handleFormSubmit = (data: ProductFormData) => {
    const output: ProductFormOutput = {
      ...data,
      consumption_limit_days:
        data.consumption_limit_days && data.consumption_limit_days !== ""
          ? Number(data.consumption_limit_days)
          : null,
    };
    onSubmit(output);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={formStyles.grid}>
      <div className={formStyles.field}>
        <Label htmlFor="maker_part_code" className={formStyles.label}>
          メーカー品番 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="maker_part_code"
          {...register("maker_part_code")}
          placeholder="例: MAKER-001"
          disabled={isEditMode}
          className={formStyles.input}
        />
        {errors.maker_part_code && (
          <p className={formStyles.error}>{errors.maker_part_code.message}</p>
        )}
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
        <Label htmlFor="base_unit" className={formStyles.label}>
          単位 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="base_unit"
          {...register("base_unit")}
          placeholder="例: EA, KG, CS"
          className={formStyles.input}
        />
        {errors.base_unit && <p className={formStyles.error}>{errors.base_unit.message}</p>}
      </div>

      <div className={formStyles.field}>
        <Label htmlFor="consumption_limit_days" className={formStyles.label}>
          消費期限日数
        </Label>
        <Input
          id="consumption_limit_days"
          type="number"
          {...register("consumption_limit_days")}
          placeholder="例: 30"
          className={formStyles.input}
        />
        {errors.consumption_limit_days && (
          <p className={formStyles.error}>{errors.consumption_limit_days.message}</p>
        )}
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
