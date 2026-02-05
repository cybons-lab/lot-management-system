import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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

// 調整理由のテンプレート
const REASON_TEMPLATES = [
  { value: "", label: "選択してください" },
  { value: "検品時に不良品を発見したため", label: "検品時に不良品を発見" },
  { value: "数量を誤って入力したため", label: "入力ミス" },
  { value: "実地棚卸で数量差異が発見されたため", label: "棚卸差異" },
  { value: "破損・汚損により使用不可となったため", label: "破損・汚損" },
  { value: "有効期限切れのため廃棄", label: "期限切れ廃棄" },
  { value: "返品処理のため", label: "返品処理" },
  { value: "other", label: "その他（詳細を入力）" },
] as const;

const quantityUpdateSchema = z.object({
  newQuantity: z.number().nonnegative("数量は0以上を入力してください"),
  reasonTemplate: z.string().min(1, "調整理由を選択してください"),
  reasonDetail: z.string().max(500, "詳細は500文字以内で入力してください").optional(),
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
      reasonTemplate: "",
      reasonDetail: "",
    },
  });

  const handleSubmit = async (data: QuantityUpdateFormData) => {
    try {
      // テンプレートが "その他" の場合は詳細を使用、それ以外はテンプレートを使用
      const finalReason =
        data.reasonTemplate === "other" ? data.reasonDetail || "" : data.reasonTemplate;

      if (!finalReason) {
        form.setError("reasonDetail", { message: "調整理由の詳細を入力してください" });
        return;
      }

      await onConfirm(data.newQuantity, finalReason);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Quantity update failed:", error);
    }
  };

  const newQuantity = form.watch("newQuantity");
  const reasonTemplate = form.watch("reasonTemplate");
  const difference = newQuantity - currentQuantity;

  // テンプレート変更時に詳細をクリア
  useEffect(() => {
    if (reasonTemplate !== "other") {
      form.setValue("reasonDetail", "");
    }
  }, [reasonTemplate, form]);

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
              name="reasonTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    調整理由 <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {REASON_TEMPLATES.map((template) => (
                        <option key={template.value} value={template.value}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {reasonTemplate === "other" && (
              <FormField
                control={form.control}
                name="reasonDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>詳細</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="調整理由の詳細を入力してください"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
