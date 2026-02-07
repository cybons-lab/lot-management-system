import { BulkPermanentDeleteDialog, BulkSoftDeleteDialog } from "@/components/common";

interface SupplierBulkDialogProps {
    isAdmin: boolean;
    isOpen: boolean;
    onOpenChange: (o: boolean) => void;
    count: number;
    isPending: boolean;
    onConfirmP: () => void;
    onConfirmS: (e: string | null) => void;
}

export function SupplierBulkDialog({ isAdmin, isOpen, onOpenChange, count, isPending, onConfirmP, onConfirmS }: SupplierBulkDialogProps) {
    if (isAdmin) {
        return (
            <BulkPermanentDeleteDialog open={isOpen} onOpenChange={onOpenChange} selectedCount={count} onConfirm={onConfirmP} isPending={isPending} title="選択した仕入先を完全に削除しますか？" description={`選択された ${count} 件の仕入先を完全に削除します。`} />
        );
    }
    return (
        <BulkSoftDeleteDialog open={isOpen} onOpenChange={onOpenChange} selectedCount={count} onConfirm={onConfirmS} isPending={isPending} title="選択した仕入先を無効化しますか？" description={`選択された ${count} 件の仕入先を無効化します。`} />
    );
}
