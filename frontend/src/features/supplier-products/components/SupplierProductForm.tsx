/**
 * SupplierProductForm - 仕入先商品登録・編集フォーム
 */
/* eslint-disable max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため */
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
import { type Supplier } from "@/features/suppliers/api";

const schema = z.object({
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  maker_part_no: z.string().min(1, "メーカー品番を入力してください"),
  display_name: z.string().min(1, "製品名を入力してください"),
  base_unit: z.string().min(1, "基本単位を入力してください"),
  lead_time_days: z.number().nullable(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;
type SupplierProductEditInput = Omit<SupplierProductUpdate, "version">;

interface SupplierProductFormProps {
  initialData?: SupplierProduct;
  suppliers: Supplier[];
  onSubmit: (data: SupplierProductCreate | SupplierProductEditInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

// eslint-disable-next-line complexity -- フォームコンポーネントのため許容
export function SupplierProductForm({
  initialData,
  suppliers,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEdit = false,
}: SupplierProductFormProps) {
  const form = useForm<FormValues>({
    // @ts-expect-error - compatibility issue between zod and react-hook-form versions
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || 0,
      maker_part_no: initialData?.maker_part_no || "",
      display_name: initialData?.display_name || "",
      base_unit: initialData?.base_unit || "EA",
      lead_time_days: initialData?.lead_time_days ?? null,
      notes: initialData?.notes || "",
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    const notes = values.notes ?? null;
    if (isEdit) {
      const updateData: SupplierProductEditInput = {
        maker_part_no: values.maker_part_no,
        display_name: values.display_name,
        base_unit: values.base_unit,
        lead_time_days: values.lead_time_days,
        notes,
      };
      onSubmit(updateData);
    } else {
      const createData: SupplierProductCreate = {
        supplier_id: values.supplier_id,
        maker_part_no: values.maker_part_no,
        display_name: values.display_name,
        base_unit: values.base_unit,
        lead_time_days: values.lead_time_days,
        notes,
      };
      onSubmit(createData);
    }
  };

  return (
    <Form {...form}>
      {/* @ts-expect-error -- react-hook-form と zod のバージョン間の型不整合 */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* 仕入先 (編集時は変更不可) - Phase1で最初に移動 */}
        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                仕入先 <span className="text-red-500">*</span>
              </FormLabel>
              <Select
                {...(field.value ? { value: String(field.value) } : {})}
                onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
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

        {/* メーカー品番 - 必須フィールド */}
        <FormField
          control={form.control}
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

        {/* 製品名 - 必須フィールド */}
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                製品名 <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 六角ボルト M10" />
              </FormControl>
              <FormDescription>この製品の名称を入力してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 基本単位 - 必須フィールド */}
        <FormField
          control={form.control}
          name="base_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                基本単位 <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: EA, pcs, kg" />
              </FormControl>
              <FormDescription>
                在庫管理の基本単位を入力してください（例: EA（個）, pcs（個）, kg, m）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* リードタイム */}
        <FormField
          control={form.control}
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

        {/* 備考 (オプション) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>備考</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="特記事項があれば入力" />
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
