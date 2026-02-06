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

function CompleteButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button
      variant="default"
      size="sm"
      className="bg-green-600 text-white hover:bg-green-700"
      onClick={onClick}
      disabled={disabled}
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      完了にする
    </Button>
  );
}

function SapLinkageButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  return (
    <Button
      variant="default"
      size="sm"
      className="bg-blue-600 text-white hover:bg-blue-700"
      onClick={onClick}
      disabled={isPending}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
      SAP連携(RPA)
    </Button>
  );
}

function DeleteButton({
  onClick,
  disabled,
  errorItemCount,
}: {
  onClick: () => void;
  disabled: boolean;
  errorItemCount: number;
}) {
  return (
    <Button variant="destructive" size="sm" onClick={onClick} disabled={disabled}>
      <Trash2 className="mr-2 h-4 w-4" />
      削除 ({errorItemCount})
    </Button>
  );
}

function RestoreButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-gray-50"
      onClick={onClick}
      disabled={disabled}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      未処理に戻す
    </Button>
  );
}

function ExportButton({ onClick, isExporting }: { onClick: () => void; isExporting: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-gray-50"
      onClick={onClick}
      disabled={isExporting}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "エクスポート中..." : "Excelエクスポート"}
    </Button>
  );
}

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
  const hasSelection = selectedIds.length > 0;
  const isCurrentView = viewMode === "current";
  const showCurrentSelectionActions = isCurrentView && hasSelection;
  const showCompletedSelectionActions = viewMode === "completed" && hasSelection;

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
      {showCurrentSelectionActions && (
        <>
          <CompleteButton onClick={handleManualComplete} disabled={completeMutationPending} />
          <SapLinkageButton onClick={handleSapLinkage} isPending={isRpaStarting} />
          <DeleteButton
            onClick={handleDeleteClick}
            disabled={!hasSelection || errorItemCount === 0 || deleteMutationPending}
            errorItemCount={errorItemCount}
          />
        </>
      )}

      {showCompletedSelectionActions && (
        <RestoreButton onClick={handleManualRestore} disabled={restoreMutationPending} />
      )}

      <RefreshButton queryKey={["ocr-results"]} isLoading={isLoading} />

      {isCurrentView && <ExportButton onClick={handleExport} isExporting={isExporting} />}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemCount={errorItemCount}
      />
    </div>
  );
}
