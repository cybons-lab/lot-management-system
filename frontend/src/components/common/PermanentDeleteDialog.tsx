/**
 * 物理削除確認ダイアログコンポーネント（後方互換ラッパー）
 *
 * 新しい DeleteDialog コンポーネントを使用したラッパー。
 * 既存のインターフェースを維持しつつ、内部実装を統合コンポーネントに委譲。
 *
 * @deprecated 新規コードでは DeleteDialog を直接使用してください
 */

import { DeleteDialog } from "./DeleteDialog";

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
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      type="permanent"
      bulk={false}
      title={title}
      description={description}
      confirmationPhrase={confirmationPhrase}
      onConfirm={onConfirm}
      isPending={isPending}
    />
  );
}
