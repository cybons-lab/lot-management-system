/**
 * SupplierProductForm - 仕入先商品登録・編集フォーム
 */
/* eslint-disable max-lines-per-function */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  type SupplierProduct,
  type SupplierProductCreate,
  type SupplierProductUpdate,
} from "../api";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@/components/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { type Product } from "@/features/products/api";
import { type Supplier } from "@/features/suppliers/api";

const schema = z.object({
  product_id: z.coerce.number().min(1, "商品を選択してください"),
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  is_primary: z.boolean().default(false),
  lead_time_days: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface SupplierProductFormProps {
  initialData?: SupplierProduct;
  products: Product[];
  suppliers: Supplier[];
  onSubmit: (data: SupplierProductCreate | SupplierProductUpdate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

export function SupplierProductForm({
  initialData,
  products,
  suppliers,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEdit = false,
}: SupplierProductFormProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: initialData?.product_id || 0,
      supplier_id: initialData?.supplier_id || 0,
      is_primary: initialData?.is_primary || false,
      lead_time_days: initialData?.lead_time_days ?? null,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const control = form.control as any;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 商品 (編集時は変更不可) */}
        <FormField
          control={control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>商品</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isEdit}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="商品を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.product_code} - {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 仕入先 (編集時は変更不可) */}
        <FormField
          control={control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>仕入先</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isEdit}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="仕入先を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.supplier_code} - {s.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 主要仕入先フラグ */}
        <FormField
          control={control}
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">主要仕入先</FormLabel>
                <FormDescription>この商品のメイン仕入先として設定します</FormDescription>
              </div>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* リードタイム */}
        <FormField
          control={control}
          name="lead_time_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>リードタイム (日)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value === null ? "" : field.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? null : Number(val));
                  }}
                  placeholder="未設定"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? "保存" : "登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
