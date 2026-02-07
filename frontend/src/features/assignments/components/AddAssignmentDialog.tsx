/**
 * AddAssignmentDialog.tsx
 *
 * 新規担当者を追加するダイアログ
 * ユーザーと仕入先を選択して担当を作成
 */

import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type Control } from "react-hook-form";

import { useAssignmentMutations } from "../hooks/useAssignments";

import {
  Button,
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
}

interface AssignmentSelectFieldProps {
  control: Control<FormValues>;
  name: "userId" | "supplierId";
  label: string;
  placeholder: string;
  requiredMessage: string;
  options: { value: string; label: string }[];
}

function AssignmentSelectField({
  control,
  name,
  label,
  placeholder,
  requiredMessage,
  options,
}: AssignmentSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      rules={{ required: requiredMessage }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DefaultTrigger() {
  return (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      担当追加
    </Button>
  );
}

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
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createAssignment({
        user_id: Number(data.userId),
        supplier_id: Number(data.supplierId),
        is_primary: false,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const userOptions = users.map((user) => ({
    value: String(user.user_id),
    label: user.display_name || user.username,
  }));
  const supplierOptions = suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.supplier_name} (${supplier.supplier_code})`,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <DefaultTrigger />}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>担当割り当ての追加</DialogTitle>
          <DialogDescription>ユーザーと仕入先を選択して担当割り当てを作成します</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AssignmentSelectField
              control={form.control}
              name="userId"
              label="ユーザー"
              placeholder="ユーザーを選択"
              requiredMessage="ユーザーを選択してください"
              options={userOptions}
            />

            <AssignmentSelectField
              control={form.control}
              name="supplierId"
              label="仕入先"
              placeholder="仕入先を選択"
              requiredMessage="仕入先を選択してください"
              options={supplierOptions}
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
