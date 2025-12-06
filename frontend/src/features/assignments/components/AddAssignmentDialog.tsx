/**
 * AddAssignmentDialog.tsx
 *
 * 新規担当者を追加するダイアログ
 * ユーザーと仕入先を選択して担当を作成
 */

import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAssignmentMutations } from "../hooks/useAssignments";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useSuppliers } from "@/features/suppliers";
import { useUsers } from "@/features/users/hooks";

interface AddAssignmentDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormValues {
  userId: string;
  supplierId: string;
  isPrimary: boolean;
}

// ダイアログのフォームとUIを一箇所にまとめるため分割しない
// eslint-disable-next-line max-lines-per-function
export function AddAssignmentDialog({ trigger, onSuccess }: AddAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();
  const { data: users = [] } = useUsers({ is_active: true });
  const { createAssignment, isCreating } = useAssignmentMutations();

  const form = useForm<FormValues>({
    defaultValues: {
      userId: "",
      supplierId: "",
      isPrimary: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createAssignment({
        user_id: Number(data.userId),
        supplier_id: Number(data.supplierId),
        is_primary: data.isPrimary,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            担当追加
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>担当割り当ての追加</DialogTitle>
          <DialogDescription>ユーザーと仕入先を選択して担当割り当てを作成します</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              rules={{ required: "ユーザーを選択してください" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ユーザー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ユーザーを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={String(user.user_id)}>
                          {user.display_name || user.username}
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
              name="supplierId"
              rules={{ required: "仕入先を選択してください" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>仕入先</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="仕入先を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.supplier_name} ({supplier.supplier_code})
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
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>主担当として設定</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      この仕入先の主担当者として設定します（既存の主担当者は解除されます）
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
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
