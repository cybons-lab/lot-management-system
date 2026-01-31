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
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createAssignment({
        user_id: userId,
        supplier_id: Number(data.supplierId),
        is_primary: false, // Unified all as false for frontend (handled by backend or future logic)
      });

      // キャッシュを無効化してリアルタイム反映
      // Note: useMySuppliers は ["user-suppliers", userId] を使用
      await queryClient.invalidateQueries({ queryKey: ["user-suppliers", userId] });
      await queryClient.invalidateQueries({ queryKey: ["user-suppliers", undefined] });

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
