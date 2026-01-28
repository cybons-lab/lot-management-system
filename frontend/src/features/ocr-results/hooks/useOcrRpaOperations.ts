import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { executeSapOrderEntryStart } from "@/features/rpa/api";

export function useOcrRpaOperations({
  selectedIds,
  flushPendingEdits,
}: {
  selectedIds: (string | number)[];
  flushPendingEdits: () => Promise<void>;
}) {
  const queryClient = useQueryClient();

  const startRpaMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting RPA Job with IDs:", selectedIds);
      // 1. Flush ongoing edits
      await flushPendingEdits();

      // 2. Validate IDs
      const numericIds = selectedIds.map((id) => Number(id)).filter((id) => !isNaN(id));
      if (numericIds.length === 0) {
        console.error("No valid IDs selected for RPA");
        throw new Error("有効な項目が選択されていません");
      }

      const response = await executeSapOrderEntryStart(numericIds);
      console.log("RPA Start Response:", response);
      return response;
    },
    onSuccess: (data) => {
      toast.success(`${data.target_count}件のSAP連携(RPA)を開始しました (Job ID: ${data.job_id})`);
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });

      if (data.launch_url) {
        console.log("Launching RPA with URL:", data.launch_url);
        // If protocol handler is supported, this will open RPA launcher
        window.open(data.launch_url, "_blank");
      }
    },
    onError: (error: unknown) => {
      console.error("RPA Start Error:", error);
      const err = error as {
        response?: { data?: { detail?: string | object } };
        message?: string;
      };
      const detail = err.response?.data?.detail;
      const detailMsg = typeof detail === "string" ? detail : JSON.stringify(detail);
      toast.error(`SAP連携の開始に失敗しました: ${detailMsg || err.message}`);
    },
  });

  const handleSapLinkage = async () => {
    if (selectedIds.length === 0) {
      toast.error("SAP連携する項目を選択してください");
      return;
    }

    if (!window.confirm(`${selectedIds.length}件のデータをSAP連携(RPA)しますか？`)) {
      return;
    }

    startRpaMutation.mutate();
  };

  return {
    handleSapLinkage,
    isRpaStarting: startRpaMutation.isPending,
  };
}
