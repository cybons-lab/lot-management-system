import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";

const quantityUpdateSchema = z.object({
  newQuantity: z.number().nonnegative("数量は0以上を入力してください"),
  reason: z
    .string()
    .min(1, "調整理由は必須です")
    .max(500, "調整理由は500文字以内で入力してください"),
});

type QuantityUpdateFormData = z.infer<typeof quantityUpdateSchema>;

interface LotQuantityUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotNumber: string;
  currentQuantity: number;
  onConfirm: (newQuantity: number, reason: string) => Promise<void>;
  isLoading?: boolean;
}

/* eslint-disable max-lines-per-function */
export function LotQuantityUpdateDialog({
  open,
  onOpenChange,
  lotNumber,
  currentQuantity,
  onConfirm,
  isLoading = false,
}: LotQuantityUpdateDialogProps) {
  const form = useForm<QuantityUpdateFormData>({
    resolver: zodResolver(quantityUpdateSchema),
    defaultValues: {
      newQuantity: currentQuantity,
      reason: "",
    },
  });

  const handleSubmit = async (data: QuantityUpdateFormData) => {
    try {
      await onConfirm(data.newQuantity, data.reason);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Quantity update failed:", error);
    }
  };

  const newQuantity = form.watch("newQuantity");
  const difference = newQuantity - currentQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>入庫数調整</DialogTitle>
          <DialogDescription>
            ロット番号: {lotNumber}
            <br />
            現在の入庫数: {currentQuantity}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新しい入庫数</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" placeholder="入庫数を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>変更前:</span>
                <span>{currentQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>変更後:</span>
                <span>{newQuantity}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>差分:</span>
                <span
                  className={
                    difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : ""
                  }
                >
                  {difference > 0 ? "+" : ""}
                  {difference}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    調整理由 <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="例: 検品時に不良品10個を発見したため"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading || difference === 0}>
                {isLoading ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
