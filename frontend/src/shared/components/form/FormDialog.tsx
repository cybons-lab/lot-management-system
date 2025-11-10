/**
 * FormDialog.tsx
 *
 * モーダルフォームコンポーネント
 * - ダイアログベースのフォーム
 * - 送信・キャンセルボタン
 * - ローディング状態
 */

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================
// 型定義
// ============================================

export interface FormDialogProps {
  /** ダイアログのタイトル */
  title: string;
  /** ダイアログの説明 */
  description?: string;
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** フォームの送信処理 (オプション: 子フォームが独自に処理する場合は不要) */
  onSubmit?: () => void | Promise<void>;
  /** フォームの内容 */
  children: React.ReactNode;
  /** 送信ボタンのラベル */
  submitLabel?: string;
  /** キャンセルボタンのラベル */
  cancelLabel?: string;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 送信ボタンの無効化 */
  submitDisabled?: boolean;
  /** ダイアログのサイズ */
  size?: "sm" | "md" | "lg" | "xl";
}

// ============================================
// メインコンポーネント
// ============================================

export function FormDialog({
  title,
  description,
  open,
  onClose,
  onSubmit,
  children,
  submitLabel = "保存",
  cancelLabel = "キャンセル",
  isLoading = false,
  submitDisabled = false,
  size = "md",
}: FormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || submitDisabled || !onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onClose();
  };

  // サイズに応じたクラス
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <Dialog open={open} onOpenChange={(open: boolean) => !open && handleCancel()}>
      <DialogContent
        className={sizeClasses[size]}
        aria-describedby={description ? undefined : "dialog-content"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {!description && (
            <DialogDescription id="dialog-content" className="sr-only">
              {title}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">{children}</div>

        {/* Only render footer if onSubmit is provided (for backwards compatibility) */}
        {onSubmit && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || submitDisabled || isLoading}
            >
              {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// 確認ダイアログ
// ============================================

export interface ConfirmDialogProps {
  /** ダイアログのタイトル */
  title: string;
  /** ダイアログの説明 */
  description: string;
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** 確認時の処理 */
  onConfirm: () => void | Promise<void>;
  /** 確認ボタンのラベル */
  confirmLabel?: string;
  /** キャンセルボタンのラベル */
  cancelLabel?: string;
  /** 確認ボタンのバリアント */
  confirmVariant?: "default" | "destructive";
  /** ローディング状態 */
  isLoading?: boolean;
}

/**
 * 確認ダイアログ
 * (削除確認など、簡単な確認用)
 */
export function ConfirmDialog({
  title,
  description,
  open,
  onClose,
  onConfirm,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  confirmVariant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open: boolean) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
          >
            {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
