/**
 * UomConversionDeleteDialog - 単位換算削除確認ダイアログ
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/display/alert-dialog";

interface DeleteTarget {
  conversion_id: number;
  product_name: string;
  product_code: string;
  external_unit: string;
}

interface UomConversionDeleteDialogProps {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function UomConversionDeleteDialog({
  target,
  onOpenChange,
  onDelete,
  isDeleting,
}: UomConversionDeleteDialogProps) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>単位換算を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            製品「{target?.product_name}」（{target?.product_code}）の 外部単位「
            {target?.external_unit}」の換算情報を削除します。 この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
