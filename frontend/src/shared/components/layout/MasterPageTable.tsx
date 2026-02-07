import { type ReactNode } from "react";

import { MasterPageToolbar } from "./MasterPageToolbar";

import { DataTable, type Column, type SortConfig } from "@/shared/components/data/DataTable";

export interface MasterPageTableProps<T> {
  // Toolbar props
  tableTitle?: string | undefined;
  searchQuery?: string | undefined;
  onSearchQueryChange?: ((value: string) => void) | undefined;
  searchPlaceholder?: string | undefined;
  leftToolbarControls?: ReactNode | undefined;
  rightToolbarControls?: ReactNode | undefined;

  // Table props
  data: T[];
  columns: Column<T>[];
  sort?: SortConfig | undefined;
  onSortChange?: ((sort: SortConfig) => void) | undefined;
  getRowId?: ((row: T) => string | number) | undefined;
  onRowClick?: ((row: T) => void) | undefined;
  isLoading?: boolean | undefined;
  emptyMessage?: string | undefined;
  selectable?: boolean | undefined;
  selectedIds?: (string | number)[] | undefined;
  onSelectionChange?: ((selectedIds: (string | number)[]) => void) | undefined;

  // Slots
  afterTable?: ReactNode | undefined;
}

export function MasterPageTable<T>({
  tableTitle,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  leftToolbarControls,
  rightToolbarControls,
  data,
  columns,
  sort,
  onSortChange,
  getRowId,
  onRowClick,
  isLoading,
  emptyMessage,
  selectable,
  selectedIds,
  onSelectionChange,
  afterTable,
}: MasterPageTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <MasterPageToolbar
        title={tableTitle}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        searchPlaceholder={searchPlaceholder}
        leftControls={leftToolbarControls}
        rightControls={rightToolbarControls}
      />
      <DataTable
        data={data}
        columns={columns}
        sort={sort}
        onSortChange={onSortChange}
        getRowId={getRowId}
        onRowClick={onRowClick}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        className="rounded-none border-none shadow-none"
      />
      {afterTable && <div className="border-t">{afterTable}</div>}
    </div>
  );
}
