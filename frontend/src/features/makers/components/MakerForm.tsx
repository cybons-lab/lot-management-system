import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control } from "react-hook-form";
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

function buildMakerDefaultValues(initialData?: Maker): MakerFormValues {
  return {
    maker_code: initialData?.maker_code ?? "",
    maker_name: initialData?.maker_name ?? "",
    display_name: initialData?.display_name ?? "",
    short_name: initialData?.short_name ?? "",
    notes: initialData?.notes ?? "",
  };
}

function getSubmitLabel(initialData?: Maker) {
  return initialData ? "更新" : "作成";
}

function MakerInputField({
  control,
  name,
  label,
  placeholder,
  disabled,
  normalizeNullable = false,
}: {
  control: Control<MakerFormValues>;
  name: "maker_code" | "maker_name" | "display_name" | "short_name";
  label: string;
  placeholder?: string;
  disabled?: boolean;
  normalizeNullable?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={normalizeNullable ? field.value || "" : field.value}
              disabled={disabled}
              placeholder={placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MakerNotesField({
  control,
  disabled,
}: {
  control: Control<MakerFormValues>;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>備考</FormLabel>
          <FormControl>
            <Textarea {...field} value={field.value || ""} disabled={disabled} rows={3} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function MakerForm({ initialData, onSubmit, onCancel, isSubmitting }: MakerFormProps) {
  const form = useForm<MakerFormValues>({
    resolver: zodResolver(makerSchema),
    defaultValues: buildMakerDefaultValues(initialData),
  });
  const isCodeDisabled = Boolean(initialData) || Boolean(isSubmitting);
  const submitLabel = getSubmitLabel(initialData);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <MakerInputField
          control={form.control}
          name="maker_code"
          label="メーカーコード (層別コード)"
          placeholder="M001"
          disabled={isCodeDisabled}
        />

        <MakerInputField
          control={form.control}
          name="maker_name"
          label="メーカー名"
          placeholder="株式会社サンプル"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-4">
          <MakerInputField
            control={form.control}
            name="display_name"
            label="表示名"
            disabled={isSubmitting}
            normalizeNullable
          />

          <MakerInputField
            control={form.control}
            name="short_name"
            label="略称"
            disabled={isSubmitting}
            normalizeNullable
          />
        </div>

        <MakerNotesField control={form.control} disabled={isSubmitting} />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
