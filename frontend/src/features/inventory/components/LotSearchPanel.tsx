import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { LotFilterBar } from "./LotFilterBar";
import { LotTable } from "./LotTable";
import type { LotTableProps } from "./LotTable";

import { useLotLabel } from "@/features/inventory/hooks/useLotLabel";
import { lotSearchStateAtom, type LotSearchState } from "@/features/inventory/state";
import { useLotSearch } from "@/hooks/api/useLotSearch";
import { useDebounce } from "@/hooks/ui/useDebounce";

export function LotSearchPanel() {
  const [searchState, setSearchState] = useAtom(lotSearchStateAtom);
  const [inputValue, setInputValue] = useState(searchState.q);
  const debouncedQuery = useDebounce(inputValue, 500);

  // Update query when debounce finishes
  useEffect(() => {
    if (debouncedQuery !== searchState.q) {
      setSearchState((prev) => ({ ...prev, q: debouncedQuery, page: 1 }));
    }
  }, [debouncedQuery, searchState.q, setSearchState]);

  const { data, isLoading, error } = useLotSearch({
    q: searchState.q,
    page: searchState.page,
    size: searchState.size,
    sort_by: searchState.sort_by,
    sort_order: searchState.sort_order,
    status: searchState.status === "all" ? undefined : searchState.status,
  });

  const { tableAdapter, handleSortChange } = useTableController(searchState, setSearchState, data);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { downloadLabels, isDownloading } = useLotLabel();

  const handleDownloadLabels = async () => {
    await downloadLabels(selectedIds);
    setSelectedIds([]); // Clear selection after download
  };

  return (
    <div className="space-y-4">
      <LotFilterBar
        inputValue={inputValue}
        onInputChange={setInputValue}
        status={searchState.status}
        onStatusChange={(val) => setSearchState((prev) => ({ ...prev, status: val, page: 1 }))}
        selectedCount={selectedIds.length}
        onDownload={handleDownloadLabels}
        isDownloading={isDownloading}
        isLoading={isLoading}
      />

      {/* Lot Table */}
      <div className="rounded-md border bg-white shadow-sm">
        <LotTable
          lots={data?.items ?? []}
          table={tableAdapter as LotTableProps["table"]}
          isLoading={isLoading}
          error={error}
          onSortChange={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </div>
  );
}

function useTableController(
  searchState: LotSearchState,
  setSearchState: React.Dispatch<React.SetStateAction<LotSearchState>>,
  data: { total: number } | undefined,
) {
  const handlePageChange = (newPage: number) => {
    setSearchState((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setSearchState((prev) => ({ ...prev, size: newSize, page: 1 }));
  };

  const handleSortChange = (column: string) => {
    setSearchState((prev) => {
      if (prev.sort_by === column) {
        return { ...prev, sort_order: prev.sort_order === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sort_by: column, sort_order: "asc" };
    });
  };

  const tableAdapter = {
    sortData: <T,>(d: T[]) => d,
    paginateData: <T,>(d: T[]) => d,
    calculatePagination: () => ({
      page: searchState.page,
      pageSize: searchState.size,
      totalItems: data?.total ?? 0,
      totalPages: Math.ceil((data?.total ?? 0) / searchState.size),
    }),
    sort: {
      column: searchState.sort_by,
      direction: searchState.sort_order,
    },
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  };

  return { tableAdapter, handleSortChange };
}
