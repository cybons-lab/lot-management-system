import { useMemo } from "react";

import type { useOcrExportOperations } from "./useOcrExportOperations";
import type { useOcrRpaOperations } from "./useOcrRpaOperations";
import type { useOcrStatusOperations } from "./useOcrStatusOperations";

export function useOcrActions({
  statusOps,
  exportOps,
  rpaOps,
}: {
  statusOps: ReturnType<typeof useOcrStatusOperations>;
  exportOps: ReturnType<typeof useOcrExportOperations>;
  rpaOps: ReturnType<typeof useOcrRpaOperations>;
}) {
  return useMemo(
    () => ({
      handleManualComplete: statusOps.handleManualComplete,
      handleManualRestore: statusOps.handleManualRestore,
      handleDelete: statusOps.handleDelete,
      handleExport: exportOps.handleExport,
      handleExportProcess: exportOps.handleExportProcess,
      setDownloadConfirmOpen: exportOps.setDownloadConfirmOpen,
      completeMutation: statusOps.completeMutation,
      restoreMutation: statusOps.restoreMutation,
      deleteMutation: statusOps.deleteMutation,
      isExporting: exportOps.isExporting,
      downloadConfirmOpen: exportOps.downloadConfirmOpen,
      handleSapLinkage: rpaOps.handleSapLinkage,
      isRpaStarting: rpaOps.isRpaStarting,
    }),
    [statusOps, exportOps, rpaOps],
  );
}
