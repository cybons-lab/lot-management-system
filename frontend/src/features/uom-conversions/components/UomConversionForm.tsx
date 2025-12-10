/**
 * UomConversionForm - 単位換算登録フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  product_id: z.coerce.number().min(1, "製品を選択してください"),
  external_unit: z.string().min(1, "外部単位は必須です").max(20, "20文字以内"),
  factor: z.coerce.number().positive("正の数を入力してください"),
});

type FormValues = z.infer<typeof schema>;

interface UomConversionFormProps {
  products: Array<{ id: number; product_name: string; product_code: string }>;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function UomConversionForm({
  products,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UomConversionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: 0, external_unit: "", factor: 1 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>製品</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
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
          name="external_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>外部単位</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: KG, BOX, PCS" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="factor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>換算係数</FormLabel>
              <FormControl>
                <Input type="number" step="any" {...field} placeholder="例: 1.5" />
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
            {isSubmitting ? "登録中..." : "登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
