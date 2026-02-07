/**
 * UserSupplierAssignmentDialog
 * ユーザーに担当仕入先を追加するダイアログ
 */
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type Control } from "react-hook-form";
import { toast } from "sonner";

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
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";

interface UserSupplierAssignmentDialogProps {
  userId: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormValues {
  supplierId: string;
}

function DefaultTrigger() {
  return (
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" />
      担当追加
    </Button>
  );
}

function SupplierSelectField({
  control,
  options,
}: {
  control: Control<FormValues>;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField
      control={control}
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

export function UserSupplierAssignmentDialog({
  userId,
  trigger,
  onSuccess,
}: UserSupplierAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { useList: useSupplierList } = useSuppliers();
  const { data: suppliers = [] } = useSupplierList();
  const { createAssignment } = useAssignmentMutations();

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
        is_primary: false,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
      toast.success("担当仕入先を追加しました");
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const supplierOptions = suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.supplier_name} (${supplier.supplier_code})`,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <DefaultTrigger />}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>担当仕入先の追加</DialogTitle>
          <DialogDescription>ユーザーに新しい仕入先を担当として割り当てます</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <SupplierSelectField control={form.control} options={supplierOptions} />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">追加</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
