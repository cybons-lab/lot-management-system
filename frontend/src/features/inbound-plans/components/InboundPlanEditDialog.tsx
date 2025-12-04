import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui";
import { Input } from "@/components/ui";
import { Textarea } from "@/components/ui";
import type { components } from "@/types/api";

type InboundPlan = components["schemas"]["InboundPlanDetailResponse"];

const formSchema = z.object({
  planned_arrival_date: z.string().min(1, "入荷予定日は必須です"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InboundPlanEditDialogProps {
  plan: InboundPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<void>;
}

export function InboundPlanEditDialog({
  plan,
  open,
  onOpenChange,
  onSubmit,
}: InboundPlanEditDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planned_arrival_date: "",
      notes: "",
    },
  });

  // Reset form when plan changes or dialog opens
  useEffect(() => {
    if (open && plan) {
      form.reset({
        planned_arrival_date: plan.planned_arrival_date.split("T")[0], // YYYY-MM-DD
        notes: plan.notes || "",
      });
    }
  }, [open, plan, form]);

  const handleSubmit = async (values: FormValues) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update inbound plan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>入荷予定の編集</DialogTitle>
          <DialogDescription>入荷予定日と備考を編集できます。</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <InboundPlanEditFormFields form={form} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InboundPlanEditFormFields({ form }: { form: UseFormReturn<FormValues> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="planned_arrival_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>入荷予定日</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>備考</FormLabel>
            <FormControl>
              <Textarea placeholder="備考を入力してください" className="resize-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
