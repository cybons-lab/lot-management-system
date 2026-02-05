import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const lotSplitSchema = z.object({
  splits: z
    .array(
      z.object({
        quantity: z.number().positive("数量は正の数値を入力してください"),
      }),
    )
    .min(2, "最低2つの分割が必要です"),
});

type LotSplitFormData = z.infer<typeof lotSplitSchema>;

interface LotSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotNumber: string;
  currentQuantity: number;
  onConfirm: (quantities: number[]) => Promise<void>;
  isLoading?: boolean;
}

/* eslint-disable max-lines-per-function */
export function LotSplitDialog({
  open,
  onOpenChange,
  lotNumber,
  currentQuantity,
  onConfirm,
  isLoading = false,
}: LotSplitDialogProps) {
  const form = useForm<LotSplitFormData>({
    resolver: zodResolver(lotSplitSchema),
    defaultValues: {
      splits: [{ quantity: 0 }, { quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "splits",
  });

  const handleSubmit = async (data: LotSplitFormData) => {
    const quantities = data.splits.map((s) => s.quantity);
    const total = quantities.reduce((sum, q) => sum + q, 0);

    if (total !== currentQuantity) {
      form.setError("root", {
        message: `合計数量 ${total} が現在の在庫数 ${currentQuantity} と一致しません`,
      });
      return;
    }

    try {
      await onConfirm(quantities);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Lot split failed:", error);
    }
  };

  const totalQuantity = form.watch("splits").reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const remaining = currentQuantity - totalQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ロット分割</DialogTitle>
          <DialogDescription>
            ロット番号: {lotNumber}
            <br />
            現在の在庫数: {currentQuantity}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`splits.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">分割 {index + 1}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder={`分割 ${index + 1} の数量`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ quantity: 0 })}
              disabled={isLoading}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              分割を追加
            </Button>

            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>合計:</span>
                <span className={remaining === 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                  {totalQuantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span>残り:</span>
                <span className={remaining === 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                  {remaining}
                </span>
              </div>
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading || remaining !== 0}>
                {isLoading ? "分割中..." : "分割実行"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
