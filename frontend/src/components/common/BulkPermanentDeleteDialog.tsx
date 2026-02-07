/**
 * 一括物理削除確認ダイアログコンポーネント（後方互換ラッパー）
 *
 * 新しい DeleteDialog コンポーネントを使用したラッパー。
 *
 * @deprecated 新規コードでは DeleteDialog を直接使用してください
 */

import { DeleteDialog } from "./DeleteDialog";

export interface BulkPermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}

export function BulkPermanentDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending = false,
  title,
  description,
}: BulkPermanentDeleteDialogProps) {
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      type="permanent"
      bulk={true}
      selectedCount={selectedCount}
      {...(title ? { title } : {})}
      {...(description ? { description } : {})}
      onConfirm={onConfirm}
      {...(isPending !== undefined ? { isPending } : {})}
    />
  );
}
