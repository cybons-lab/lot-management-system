/**
 * Common component exports
 */

// 統合削除ダイアログ（推奨）
export { DeleteDialog, type DeleteDialogProps, type DeleteType } from "./DeleteDialog";

// 後方互換ラッパー（deprecated - 新規コードではDeleteDialogを使用）
export { SoftDeleteDialog, type SoftDeleteDialogProps } from "./SoftDeleteDialog";
export { PermanentDeleteDialog, type PermanentDeleteDialogProps } from "./PermanentDeleteDialog";
export {
  BulkPermanentDeleteDialog,
  type BulkPermanentDeleteDialogProps,
} from "./BulkPermanentDeleteDialog";
export { BulkSoftDeleteDialog, type BulkSoftDeleteDialogProps } from "./BulkSoftDeleteDialog";
export { RestoreDialog } from "./RestoreDialog";

