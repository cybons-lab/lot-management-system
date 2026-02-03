/**
 * ConfirmDialog
 *
 * 確認ダイアログコンポーネント
 * 削除などの危険な操作の確認に使用
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
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログを閉じるコールバック */
  onOpenChange: (open: boolean) => void;
  /** 確認時のコールバック */
  onConfirm: () => void;
  /** ダイアログのタイトル */
  title: string;
  /** ダイアログの説明文 */
  description: string;
  /** 確認ボタンのラベル（デフォルト: "削除"） */
  confirmLabel?: string;
  /** キャンセルボタンのラベル（デフォルト: "キャンセル"） */
  cancelLabel?: string;
  /** 確認ボタンのバリアント（デフォルト: "destructive"） */
  variant?: "default" | "destructive";
}

/**
 * 確認ダイアログ
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={() => {
 *     deleteLot(lotId);
 *     setOpen(false);
 *   }}
 *   title="ロットを削除しますか？"
 *   description="この操作は取り消せません。"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "削除",
  cancelLabel = "キャンセル",
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === "destructive" ? "bg-red-600 hover:bg-red-700 focus:ring-red-600" : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
