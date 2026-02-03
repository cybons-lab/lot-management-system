import { CheckCircle, Download, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

import { Button, RefreshButton } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface ActionButtonsProps {
  viewMode: "current" | "completed";
  selectedIds: (string | number)[];
  handleManualComplete: () => void;
  handleManualRestore: () => void;
  handleDelete: () => void;
  handleExport: () => void;
  isExporting: boolean;
  isLoading: boolean;
  completeMutationPending: boolean;
  restoreMutationPending: boolean;
  deleteMutationPending: boolean;
  handleSapLinkage: () => void;
  isRpaStarting: boolean;
  errorItemCount: number;
}

// eslint-disable-next-line max-lines-per-function, complexity -- ActionButtonsは論理的にまとまったボタンコレクション
export function ActionButtons({
  viewMode,
  selectedIds,
  handleManualComplete,
  handleManualRestore,
  handleDelete,
  handleExport,
  isExporting,
  isLoading,
  completeMutationPending,
  restoreMutationPending,
  deleteMutationPending,
  handleSapLinkage,
  isRpaStarting,
  errorItemCount,
}: ActionButtonsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    if (errorItemCount === 0) {
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    handleDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex gap-2">
      {viewMode === "current" && selectedIds.length > 0 && (
        <Button
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleManualComplete}
          disabled={completeMutationPending}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          完了にする
        </Button>
      )}

      {viewMode === "current" && selectedIds.length > 0 && (
        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSapLinkage}
          disabled={isRpaStarting}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isRpaStarting && "animate-spin")} />
          SAP連携(RPA)
        </Button>
      )}

      {viewMode === "current" && selectedIds.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          disabled={selectedIds.length === 0 || errorItemCount === 0 || deleteMutationPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          削除 ({errorItemCount})
        </Button>
      )}

      {viewMode === "completed" && selectedIds.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="bg-gray-50"
          onClick={handleManualRestore}
          disabled={restoreMutationPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          未処理に戻す
        </Button>
      )}

      <RefreshButton queryKey={["ocr-results"]} isLoading={isLoading} />

      {viewMode === "current" && (
        <Button
          variant="outline"
          size="sm"
          className="bg-gray-50"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "エクスポート中..." : "Excelエクスポート"}
        </Button>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemCount={errorItemCount}
      />
    </div>
  );
}
