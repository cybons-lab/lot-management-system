import { ocrResultsApi } from "../api";

import { useAuthenticatedQuery } from "@/shared/hooks/useAuthenticatedQuery";

export function useOcrData(
  taskDate: string,
  statusFilter: string,
  showErrorsOnly: boolean,
  viewMode: "current" | "completed",
) {
  const query = useAuthenticatedQuery({
    queryKey: ["ocr-results", { taskDate, statusFilter, showErrorsOnly, viewMode }],
    queryFn: () => {
      if (viewMode === "completed") {
        return ocrResultsApi.listCompleted({
          task_date: taskDate || undefined,
        });
      }
      return ocrResultsApi.list({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
        has_error: showErrorsOnly || undefined,
      });
    },
  });

  const errorCount = query.data?.items.filter((item) => item.has_error).length ?? 0;

  return {
    ...query,
    errorCount,
  };
}
