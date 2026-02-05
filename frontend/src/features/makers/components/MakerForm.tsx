import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { type Maker } from "../api";

import { Button, Input } from "@/components/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/form/textarea";

const makerSchema = z.object({
  maker_code: z.string().min(1, "メーカーコードは必須です").max(50),
  maker_name: z.string().min(1, "メーカー名は必須です").max(200),
  display_name: z.string().max(200).optional().nullable(),
  short_name: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type MakerFormValues = z.infer<typeof makerSchema>;

interface MakerFormProps {
  initialData?: Maker;
  onSubmit: (data: MakerFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function MakerForm({ initialData, onSubmit, onCancel, isSubmitting }: MakerFormProps) {
  const form = useForm<MakerFormValues>({
    resolver: zodResolver(makerSchema),
    defaultValues: {
      maker_code: initialData?.maker_code || "",
      maker_name: initialData?.maker_name || "",
      display_name: initialData?.display_name || "",
      short_name: initialData?.short_name || "",
      notes: initialData?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="maker_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メーカーコード (層別コード)</FormLabel>
              <FormControl>
                <Input {...field} disabled={!!initialData || isSubmitting} placeholder="M001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maker_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メーカー名</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} placeholder="株式会社サンプル" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>表示名</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} disabled={isSubmitting} />
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
                <FormLabel>略称</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>備考</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} disabled={isSubmitting} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {initialData ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
