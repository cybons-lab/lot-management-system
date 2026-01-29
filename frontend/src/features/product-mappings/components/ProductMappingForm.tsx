/**
 * ProductMappingForm - 商品マスタ登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui";
import {
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/form/checkbox";

const schema = z.object({
  customer_id: z.coerce.number().min(1, "得意先を選択してください"),
  customer_part_code: z.string().min(1, "先方品番は必須です"),
  supplier_id: z.coerce.number().min(1, "仕入先を選択してください"),
  product_group_id: z.coerce.number().min(1, "商品を選択してください"),
  base_unit: z.string().min(1, "基本単位は必須です"),
  pack_unit: z.string().optional(),
  pack_quantity: z.coerce.number().optional(),
  special_instructions: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ProductMappingFormProps {
  initialData?: {
    customer_id?: number;
    customer_part_code?: string;
    supplier_id?: number;
    product_group_id?: number;
    base_unit?: string;
    pack_unit?: string | null;
    pack_quantity?: number | null;
    special_instructions?: string | null;
    is_active?: boolean;
  };
  customers: Array<{ id: number; customer_name: string; customer_code: string }>;
  suppliers: Array<{ id: number; supplier_name: string; supplier_code: string }>;
  products: Array<{ id: number; product_name: string; product_code: string }>;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function ProductMappingForm({
  initialData,
  customers,
  suppliers,
  products,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEdit = false,
}: ProductMappingFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      customer_id: initialData?.customer_id ?? 0,
      customer_part_code: initialData?.customer_part_code ?? "",
      supplier_id: initialData?.supplier_id ?? 0,
      product_group_id: initialData?.product_group_id ?? 0,
      base_unit: initialData?.base_unit ?? "",
      pack_unit: initialData?.pack_unit ?? "",
      pack_quantity: initialData?.pack_quantity ?? undefined,
      special_instructions: initialData?.special_instructions ?? "",
      is_active: initialData?.is_active ?? true,
    },
  });

  const handleSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({
      ...data,
      pack_unit: data.pack_unit || undefined,
      special_instructions: data.special_instructions || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>得意先</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="得意先を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.customer_code} - {c.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_part_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>先方品番</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: ABC-001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>仕入先</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(val) => field.onChange(Number(val))}
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

        <FormField
          control={form.control}
          name="product_group_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>商品</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(val) => field.onChange(Number(val))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="製品を選択" />
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

        <FormField
          control={form.control}
          name="base_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>基本単位</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: KG" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pack_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>梱包単位（任意）</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: 袋" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pack_quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>梱包数量（任意）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="例: 10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="special_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>特記事項（任意）</FormLabel>
              <FormControl>
                <Input {...field} placeholder="特記事項を入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>有効</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : isEdit ? "更新" : "登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
