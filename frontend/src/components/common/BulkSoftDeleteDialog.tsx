/**
 * Bulk Soft Delete Confirmation Dialog
 *
 * Used for bulk soft deletion (logical deletion) of master data.
 * Sets the end date for selected items.
 */

import { AlertTriangle, Calendar } from "lucide-react";
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

export interface BulkSoftDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (endDate: string | null) => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}

export function BulkSoftDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending = false,
  title = "選択項目を無効化しますか？",
  description,
}: BulkSoftDeleteDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [endDate, setEndDate] = useState(today);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEndDate(today);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onConfirm(endDate || null);
  };

  const defaultDescription = `選択された ${selectedCount} 件のデータを無効化します。`;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{description ?? defaultDescription}</span>
            <span className="block text-slate-600">
              無効化されたデータは一覧から非表示になりますが、完全には削除されません。
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              無効化対象: <span className="text-lg font-bold">{selectedCount}</span> 件
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              無効化日（終了日）
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="border-amber-200 focus:border-amber-500"
            />
            <p className="text-xs text-slate-500">この日付以降、対象データは無効として扱われます</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || selectedCount === 0}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? "処理中..." : `${selectedCount} 件を無効化`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
