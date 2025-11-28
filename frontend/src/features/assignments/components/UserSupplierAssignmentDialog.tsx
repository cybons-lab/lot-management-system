
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAssignmentMutations } from "../hooks/useAssignments";

import {
    Button,
    Checkbox,
    Dialog,
    DialogContent,
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
import { useSuppliersQuery } from "@/features/suppliers/hooks/useSuppliersQuery";

interface UserSupplierAssignmentDialogProps {
    userId: number;
    trigger?: React.ReactNode;
}

interface FormValues {
    supplierId: string;
    isPrimary: boolean;
}

export function UserSupplierAssignmentDialog({
    userId,
    trigger,
}: UserSupplierAssignmentDialogProps) {
    const [open, setOpen] = useState(false);
    const { data: suppliers } = useSuppliersQuery();
    const { createAssignment, isCreating } = useAssignmentMutations();

    const form = useForm<FormValues>({
        defaultValues: {
            supplierId: "",
            isPrimary: false,
        },
    });

    const onSubmit = async (data: FormValues) => {
        try {
            await createAssignment({
                user_id: userId,
                supplier_id: Number(data.supplierId),
                is_primary: data.isPrimary,
            });
            setOpen(false);
            form.reset();
        } catch (error) {
            // Error handling is done in the mutation hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">担当仕入先を追加</Button>}
            </DialogTrigger>
            <DialogContent>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="仕入先を選択" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {suppliers?.map((supplier) => (
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
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>主担当として設定</FormLabel>
                                        <p className="text-sm text-muted-foreground">
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
