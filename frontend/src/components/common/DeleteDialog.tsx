/**
 * 統合削除ダイアログコンポーネント
 *
 * 4種類の削除ダイアログを1つに統合:
 * - SoftDelete（論理削除）単一/一括
 * - PermanentDelete（物理削除）単一/一括
 *
 * @example
 * ```tsx
 * // 論理削除（単一）
 * <DeleteDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleSoftDelete}
 *   type="soft"
 *   itemName="製品"
 * />
 *
 * // 物理削除（一括）
 * <DeleteDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleBulkPermanentDelete}
 *   type="permanent"
 *   bulk
 *   selectedCount={5}
 * />
 * ```
 */

import { AlertTriangle, Calendar, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

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

// ========================================
// Types
// ========================================

export type DeleteType = "soft" | "permanent";

export interface DeleteDialogProps {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 削除タイプ（論理削除 or 物理削除） */
  type: DeleteType;
  /** 一括削除モード */
  bulk?: boolean;
  /** 一括削除時の選択件数 */
  selectedCount?: number;
  /**
   * 削除確認ハンドラ
   * - soft: endDateを受け取る（nullの場合はデフォルト）
   * - permanent: 引数なし
   */
  onConfirm: (endDate?: string | null) => void;
  /** 処理中フラグ */
  isPending?: boolean;
  /** 削除対象アイテムの名前（例: "ユーザー", "製品"） */
  itemName?: string;
  /** カスタムタイトル */
  title?: string;
  /** カスタム説明文 */
  description?: string;
  /** 物理削除時の確認フレーズ */
  confirmationPhrase?: string;
  /** 完全削除への切り替えハンドラ（論理削除ダイアログで使用） */
  onSwitchToPermanent?: () => void;
}

// ========================================
// Component
// ========================================

/* eslint-disable max-lines-per-function, complexity */
export function DeleteDialog({
  open,
  onOpenChange,
  type,
  bulk = false,
  selectedCount = 1,
  onConfirm,
  isPending = false,
  itemName = "アイテム",
  title,
  description,
  confirmationPhrase = "DELETE",
  onSwitchToPermanent,
}: DeleteDialogProps) {
  const isSoft = type === "soft";
  const today = new Date().toISOString().split("T")[0];

  // State
  const [endDate, setEndDate] = useState<string>(today);
  const [confirmInput, setConfirmInput] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setEndDate(today);
      setConfirmInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ========================================
  // Computed values
  // ========================================

  // タイトル
  const dialogTitle =
    title ??
    (isSoft
      ? bulk
        ? "選択項目を無効化しますか？"
        : "無効化しますか？"
      : bulk
        ? "選択項目を完全に削除しますか？"
        : "完全に削除しますか？");

  // 説明文
  const dialogDescription =
    description ??
    (isSoft
      ? bulk
        ? `選択された ${selectedCount} 件のデータを無効化します。`
        : `この${itemName}を無効化しますか？`
      : bulk
        ? `選択された ${selectedCount} 件のデータを完全に削除します。`
        : `この${itemName}を完全に削除しますか？`);

  // 確認ボタンテキスト
  const confirmButtonText = isPending
    ? "処理中..."
    : isSoft
      ? bulk
        ? `${selectedCount} 件を無効化`
        : "無効化"
      : bulk
        ? `${selectedCount} 件を完全に削除`
        : "完全に削除";

  // 確認ボタンの有効/無効
  const isConfirmDisabled =
    isPending || (bulk && selectedCount === 0) || (!isSoft && confirmInput !== confirmationPhrase);

  // Styles
  const alertStyles = isSoft
    ? {
        titleColor: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-800",
        buttonBg: "bg-amber-600 hover:bg-amber-700",
      }
    : {
        titleColor: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        buttonBg: "bg-red-600 hover:bg-red-700",
      };

  const Icon = isSoft ? AlertTriangle : Trash2;

  // ========================================
  // Handlers
  // ========================================

  const handleConfirm = () => {
    if (isSoft) {
      onConfirm(endDate || null);
    } else {
      onConfirm();
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${alertStyles.titleColor}`}>
            <Icon className="h-5 w-5" />
            {dialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{dialogDescription}</span>
            {!isSoft && (
              <span className="block font-semibold text-red-600">
                ⚠️ この操作は取り消せません。データベースから完全に削除されます。
              </span>
            )}
            {isSoft && (
              <span className="block text-slate-600">
                無効化されたデータは一覧から非表示になりますが、完全には削除されません。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* 一括削除時の件数表示 */}
          {bulk && (
            <div className={`rounded-lg p-3 ${alertStyles.bgColor}`}>
              <p className={`text-sm font-medium ${alertStyles.textColor}`}>
                {isSoft ? "無効化" : "削除"}対象:{" "}
                <span className="text-lg font-bold">{selectedCount}</span> 件
              </p>
            </div>
          )}

          {/* 論理削除: 日付入力 */}
          {isSoft && (
            <div className="space-y-2">
              <Label htmlFor="delete-end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {bulk ? "無効化日（終了日）" : "有効終了日（任意）"}
              </Label>
              <Input
                id="delete-end-date"
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                min={today}
                className={`${alertStyles.borderColor} focus:border-amber-500`}
                data-testid="delete-dialog-date-input"
              />
              <p className="text-xs text-slate-500">
                {bulk
                  ? "この日付以降、対象データは無効として扱われます"
                  : "指定しない場合は、本日をもって無効になります。将来の日付を指定すると、その日まで有効なままになります。"}
              </p>
            </div>
          )}

          {/* 物理削除: 確認フレーズ入力 */}
          {!isSoft && (
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-phrase">
                確認のため「<span className="font-bold">{confirmationPhrase}</span>
                」と入力してください
              </Label>
              <Input
                id="delete-confirm-phrase"
                value={confirmInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmInput(e.target.value)
                }
                placeholder={confirmationPhrase}
                className="border-red-200 focus:border-red-500"
                data-testid="delete-dialog-confirm-input"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {/* 論理削除から物理削除への切り替え */}
          {isSoft && onSwitchToPermanent && !bulk && (
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
            disabled={isConfirmDisabled}
            className={`${alertStyles.buttonBg} disabled:opacity-50`}
            data-testid="delete-dialog-confirm-button"
          >
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
