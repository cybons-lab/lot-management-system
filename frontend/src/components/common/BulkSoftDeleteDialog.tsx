/**
 * 一括論理削除確認ダイアログコンポーネント（後方互換ラッパー）
 *
 * 新しい DeleteDialog コンポーネントを使用したラッパー。
 *
 * @deprecated 新規コードでは DeleteDialog を直接使用してください
 */

import { DeleteDialog } from "./DeleteDialog";

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
  title,
  description,
}: BulkSoftDeleteDialogProps) {
  // Adapter to convert optional endDate to required type
  const handleConfirm = (endDate?: string | null) => {
    onConfirm(endDate ?? null);
  };

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      type="soft"
      bulk={true}
      selectedCount={selectedCount}
      {...(title ? { title } : {})}
      {...(description ? { description } : {})}
      onConfirm={handleConfirm}
      {...(isPending !== undefined ? { isPending } : {})}
    />
  );
}
