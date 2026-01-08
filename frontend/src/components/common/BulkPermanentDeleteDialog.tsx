/**
 * Bulk Permanent Delete Confirmation Dialog
 *
 * Used for bulk physical deletion of master data (admin only).
 * Requires typing "DELETE" to confirm.
 */

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

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
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";

export interface BulkPermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}

const CONFIRMATION_PHRASE = "DELETE";

export function BulkPermanentDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending = false,
  title = "選択項目を完全に削除しますか？",
  description,
}: BulkPermanentDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const isConfirmDisabled = inputValue !== CONFIRMATION_PHRASE || isPending || selectedCount === 0;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue("");
    }
    onOpenChange(newOpen);
  };

  const defaultDescription = `選択された ${selectedCount} 件のデータを完全に削除します。`;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{description ?? defaultDescription}</span>
            <span className="block font-semibold text-red-600">
              ⚠️ この操作は取り消せません。データベースから完全に削除されます。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              削除対象: <span className="text-lg font-bold">{selectedCount}</span> 件
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              確認のため「<span className="font-bold">{CONFIRMATION_PHRASE}</span>
              」と入力してください
            </Label>
            <Input
              id="confirm-phrase"
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              className="border-red-200 focus:border-red-500"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "削除中..." : `${selectedCount} 件を完全に削除`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
