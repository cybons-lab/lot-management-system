import { useState } from "react";

import { type OcrResultItem } from "../api";

export function useOcrFiltersState() {
  const [viewMode, setViewMode] = useState<"current" | "completed">("current");
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [taskDate, setTaskDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [editingRow, setEditingRow] = useState<OcrResultItem | null>(null);

  return {
    viewMode,
    setViewMode,
    selectedIds,
    setSelectedIds,
    taskDate,
    setTaskDate,
    statusFilter,
    setStatusFilter,
    showErrorsOnly,
    setShowErrorsOnly,
    editingRow,
    setEditingRow,
  };
}
