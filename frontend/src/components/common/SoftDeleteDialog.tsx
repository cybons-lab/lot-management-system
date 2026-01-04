/**
 * 論理削除確認ダイアログコンポーネント
 *
 * マスタデータの論理削除に使用します。
 * valid_toを指定された日付（デフォルト: 今日）に設定して無効化します。
 * オプションで完全削除への切り替えも可能です。
 */

import { Calendar } from "lucide-react";
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

/**
 * 論理削除ダイアログのProps
 */
export interface SoftDeleteDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** ダイアログタイトル */
  title: string;
  /** 説明文 */
  description: string;
  /** 確認時のコールバック（終了日を渡す） */
  onConfirm: (endDate: string | null) => void;
  /** 処理中フラグ */
  isPending?: boolean;
  /** 完全削除への切り替えハンドラ（管理者向け） */
  onSwitchToPermanent?: () => void;
}

export function SoftDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
  onSwitchToPermanent,
}: SoftDeleteDialogProps) {
  const [endDate, setEndDate] = useState<string>("");
  const today = new Date().toISOString().split("T")[0];

  const handleConfirm = () => {
    // If no date specified, pass null to use default (today)
    onConfirm(endDate || null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="end-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              有効終了日（任意）
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              min={today}
              placeholder="指定しない場合は本日"
            />
            <p className="text-muted-foreground text-sm">
              指定しない場合は、本日をもって無効になります。
              将来の日付を指定すると、その日まで有効なままになります。
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {onSwitchToPermanent && (
            <button
              type="button"
              onClick={onSwitchToPermanent}
              className="text-destructive mr-auto mb-2 text-sm underline hover:no-underline sm:mb-0"
            >
              完全に削除する（管理者のみ）
            </button>
          )}
          <AlertDialogCancel onClick={() => onOpenChange(false)}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? "処理中..." : "無効化"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
