/* eslint-disable max-lines-per-function */
/**
 * MySupplierAssignmentDialog - 自分の担当仕入先を追加するダイアログ
 *
 * SupplierAssignmentWarning から呼び出され、
 * 現在ログイン中のユーザーの担当仕入先を追加できます。
 * 追加後は my-suppliers クエリを invalidate してリアルタイム反映します。
 */

import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { useAssignmentMutations } from "../hooks/useAssignments";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { useSuppliers } from "@/features/suppliers";

interface MySupplierAssignmentDialogProps {
  userId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  supplierId: string;
  isPrimary: boolean;
}

export function MySupplierAssignmentDialog({
  userId,
  open,
  onOpenChange,
}: MySupplierAssignmentDialogProps) {
  const queryClient = useQueryClient();
  const { useList } = useSuppliers();
  const { data: suppliers = [] } = useList();
  const { createAssignment, isCreating } = useAssignmentMutations();

  const form = useForm<FormValues>({
    defaultValues: {
      supplierId: "",
      isPrimary: true, // デフォルトで主担当として設定
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createAssignment({
        user_id: userId,
        supplier_id: Number(data.supplierId),
        is_primary: data.isPrimary,
      });

      // my-suppliers クエリを invalidate してリアルタイム反映
      await queryClient.invalidateQueries({ queryKey: ["my-suppliers"] });

      onOpenChange(false);
      form.reset();
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>担当仕入先の追加</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              rules={{ required: "仕入先を選択してください" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>仕入先</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={
                        suppliers?.map((supplier) => ({
                          value: String(supplier.id),
                          label: `${supplier.supplier_name} (${supplier.supplier_code})`,
                        })) ?? []
                      }
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="仕入先を検索..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>主担当として設定</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      この仕入先の主担当者として設定します
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "追加中..." : "追加"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
