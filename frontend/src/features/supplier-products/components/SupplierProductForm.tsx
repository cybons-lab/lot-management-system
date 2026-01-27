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
  product_id: z.coerce.number().optional().nullable(), // Phase1: オプション
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  maker_part_no: z.string().min(1, "メーカー品番を入力してください"), // Phase1: 必須
  is_primary: z.boolean().default(false),
  lead_time_days: z.number().nullable(),
  display_name: z.string().optional(),
  notes: z.string().optional(),
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

// eslint-disable-next-line complexity -- フォームコンポーネントのため許容
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
      product_id: initialData?.product_id ?? null,
      supplier_id: initialData?.supplier_id || 0,
      maker_part_no: initialData?.maker_part_no || "",
      is_primary: initialData?.is_primary || false,
      lead_time_days: initialData?.lead_time_days ?? null,
      display_name: initialData?.display_name || "",
      notes: initialData?.notes || "",
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
        {/* 仕入先 (編集時は変更不可) - Phase1で最初に移動 */}
        <FormField
          control={control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                仕入先 <span className="text-red-500">*</span>
              </FormLabel>
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

        {/* メーカー品番 - Phase1で必須フィールド */}
        <FormField
          control={control}
          name="maker_part_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                メーカー品番 <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: ABC-12345" className="font-mono" />
              </FormControl>
              <FormDescription>
                仕入先が使用している品番を入力してください（在庫管理の基準）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 商品構成 (オプション - Phase2用) */}
        <FormField
          control={control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                商品構成 <span className="text-gray-400">(オプション)</span>
              </FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v === "" ? null : Number(v))}
                disabled={isEdit}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Phase2で設定（省略可）" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">なし</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.product_code} - {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Phase1では省略可能。複数メーカー品番をまとめる場合のみ設定。
              </FormDescription>
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

        {/* 表示名 (オプション) */}
        <FormField
          control={control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>表示名 (社内呼称)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 特殊部品A" />
              </FormControl>
              <FormDescription>社内で使いやすい名称があれば入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 備考 (オプション) */}
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>備考</FormLabel>
              <FormControl>
                <Input {...field} placeholder="特記事項があれば入力" />
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
