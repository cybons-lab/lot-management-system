import { useEffect, useMemo } from "react";

import { useOcrColumns } from "../pages/useOcrColumns";

import { useOcrActions } from "./useOcrActions";
import { useOcrData } from "./useOcrData";
import { useOcrExportOperations } from "./useOcrExportOperations";
import { useOcrFiltersState } from "./useOcrFiltersState";
import { useOcrRowInputs } from "./useOcrRowInputs";
import { useOcrRpaOperations } from "./useOcrRpaOperations";
import { useOcrStatusOperations } from "./useOcrStatusOperations";

export function useOcrPageLogic() {
  const filters = useOcrFiltersState();

  const { data, isLoading, error, errorCount, refetch } = useOcrData(
    filters.taskDate,
    filters.statusFilter,
    filters.showErrorsOnly,
    filters.viewMode,
  );

  useEffect(() => {
    refetch();
  }, [refetch]); // 初回マウント時に最新データを取得

  const { getInputs, updateInputs, flushPendingEdits } = useOcrRowInputs(
    filters.viewMode,
    data?.items || [],
  );

  const statusOps = useOcrStatusOperations({
    viewMode: filters.viewMode,
    selectedIds: filters.selectedIds,
    setSelectedIds: filters.setSelectedIds,
    dataItems: data?.items || [],
    flushPendingEdits,
  });

  const exportOps = useOcrExportOperations({
    viewMode: filters.viewMode,
    selectedIds: filters.selectedIds,
    setSelectedIds: filters.setSelectedIds,
    dataItems: data?.items || [],
    flushPendingEdits,
    taskDate: filters.taskDate,
    statusFilter: filters.statusFilter,
    showErrorsOnly: filters.showErrorsOnly,
    completeMutation: statusOps.completeMutation,
  });

  const rpaOps = useOcrRpaOperations({ selectedIds: filters.selectedIds, flushPendingEdits });

  const actions = useOcrActions({ statusOps, exportOps, rpaOps });
  const contextValue = useMemo(() => ({ getInputs, updateInputs }), [getInputs, updateInputs]);
  const columns = useOcrColumns(filters.viewMode === "completed", filters.setEditingRow);

  return {
    state: { ...filters, data, isLoading, error, errorCount },
    setters: filters,
    actions,
    contextValue,
    columns,
  };
}
