/**
 * Permanent Delete Confirmation Dialog
 *
 * Used for physical deletion of master data (admin only).
 * Requires typing a confirmation phrase.
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

export interface PermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmationPhrase: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function PermanentDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmationPhrase,
  onConfirm,
  isPending = false,
}: PermanentDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const isConfirmDisabled = inputValue !== confirmationPhrase || isPending;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{description}</span>
            <span className="block font-semibold text-red-600">
              ⚠️ この操作は取り消せません。データベースから完全に削除されます。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              確認のため「<span className="font-bold">{confirmationPhrase}</span>
              」と入力してください
            </Label>
            <Input
              id="confirm-phrase"
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder={confirmationPhrase}
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
            {isPending ? "削除中..." : "完全に削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
