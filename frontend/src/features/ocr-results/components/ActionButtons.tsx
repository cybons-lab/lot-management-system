import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface ActionButtonsProps {
  viewMode: "current" | "completed";
  selectedIds: (string | number)[];
  handleManualComplete: () => void;
  handleManualRestore: () => void;
  handleExport: () => void;
  isExporting: boolean;
  isLoading: boolean;
  completeMutationPending: boolean;
  restoreMutationPending: boolean;
  handleSapLinkage: () => void;
  isRpaStarting: boolean;
}

export function ActionButtons({
  viewMode,
  selectedIds,
  handleManualComplete,
  handleManualRestore,
  handleExport,
  isExporting,
  isLoading,
  completeMutationPending,
  restoreMutationPending,
  handleSapLinkage,
  isRpaStarting,
}: ActionButtonsProps) {
  const queryClient = useQueryClient();

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

      {viewMode === "completed" && selectedIds.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRestore}
          disabled={restoreMutationPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          未処理に戻す
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
          toast.success("データを再読み込みしました");
        }}
        disabled={isLoading}
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
        再読み込み
      </Button>
      {viewMode === "current" && (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "エクスポート中..." : "Excelエクスポート"}
        </Button>
      )}
    </div>
  );
}
