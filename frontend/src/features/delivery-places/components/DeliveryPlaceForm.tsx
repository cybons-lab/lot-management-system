/**
 * DeliveryPlaceForm - 納入先登録/編集フォーム
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
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

const schema = z.object({
  delivery_place_code: z.string().min(1, "納入先コードは必須です"),
  delivery_place_name: z.string().min(1, "納入先名は必須です"),
  short_name: z
    .string()
    .max(50, "短縮名は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  customer_id: z.coerce.number().min(1, "得意先を選択してください"),
  jiku_code: z.string().min(1, "次区コードは必須です"),
  jiku_match_pattern: z
    .string()
    .max(100, "次区マッチングルールは100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface DeliveryPlaceFormProps {
  initialData?: {
    delivery_place_code?: string;
    delivery_place_name?: string;
    short_name?: string | null;
    customer_id?: number;
    jiku_code?: string | null;
    jiku_match_pattern?: string | null;
  };
  customers: Array<{ id: number; customer_name: string; customer_code: string }>;
  onSubmit: (data: FormValues & { jiku_code: string; jiku_match_pattern?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

// eslint-disable-next-line max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため
export function DeliveryPlaceForm({
  initialData,
  customers,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEdit = false,
}: DeliveryPlaceFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      delivery_place_code: initialData?.delivery_place_code ?? "",
      delivery_place_name: initialData?.delivery_place_name ?? "",
      short_name: initialData?.short_name ?? "",
      customer_id: initialData?.customer_id ?? 0,
      jiku_code: initialData?.jiku_code ?? "",
      jiku_match_pattern: initialData?.jiku_match_pattern ?? "",
    },
  });

  const handleSubmit: SubmitHandler<FormValues> = (data) => {
    onSubmit({
      ...data,
      jiku_code: data.jiku_code ?? "",
      jiku_match_pattern: data.jiku_match_pattern || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="delivery_place_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>納入先コード</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: DP001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delivery_place_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>納入先名</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 東京第一倉庫" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="short_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>短縮名（任意）</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 東京1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="jiku_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>次区コード *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="SAP連携用" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jiku_match_pattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>次区マッチングルール（任意）</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 2***" />
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
            {isSubmitting ? "保存中..." : isEdit ? "更新" : "登録"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
