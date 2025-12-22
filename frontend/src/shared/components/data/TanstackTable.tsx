import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import React, { useState } from "react";

import { TablePagination } from "@/shared/components/data/TablePagination";
import { cn } from "@/shared/libs/utils";

interface TanstackTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

const SortIcon = ({ isSorted }: { isSorted: false | "asc" | "desc" }) => {
  if (!isSorted) return <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />;
  return isSorted === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
};

const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <p className="text-sm text-gray-500">読み込み中...</p>
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-12">
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

function TableContent<TData>({ table }: { table: Table<TData> }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="border-b border-slate-200 bg-slate-50/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && <SortIcon isSorted={header.column.getIsSorted()} />}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm text-slate-800">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * TanStack Table を用いた汎用テーブルコンポーネント
 * - ソート、ページネーションを内包
 * - ヘッダー/セルの描画は ColumnDef に委譲
 */
export function TanstackTable<TData>({
  data,
  columns,
  className,
  isLoading = false,
  emptyMessage = "データがありません",
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
}: TanstackTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {isLoading ? <LoadingState /> : data.length === 0 ? <EmptyState message={emptyMessage} /> : <TableContent table={table} />}
      <TablePagination
        className="rounded-b-lg"
        currentPage={currentPage}
        pageSize={table.getState().pagination.pageSize}
        totalCount={totalRows}
        onPageChange={(page) => table.setPageIndex(page - 1)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          table.setPageSize(size);
        }}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
