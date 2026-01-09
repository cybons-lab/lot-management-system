/**
 * 論理削除確認ダイアログコンポーネント（後方互換ラッパー）
 *
 * 新しい DeleteDialog コンポーネントを使用したラッパー。
 * 既存のインターフェースを維持しつつ、内部実装を統合コンポーネントに委譲。
 *
 * @deprecated 新規コードでは DeleteDialog を直接使用してください
 */

import { DeleteDialog } from "./DeleteDialog";

export interface SoftDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: (endDate: string | null) => void;
  isPending?: boolean;
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
  // Adapter to convert optional endDate to required type
  const handleConfirm = (endDate?: string | null) => {
    onConfirm(endDate ?? null);
  };

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      type="soft"
      bulk={false}
      title={title}
      description={description}
      onConfirm={handleConfirm}
      isPending={isPending}
      onSwitchToPermanent={onSwitchToPermanent}
    />
  );
}
