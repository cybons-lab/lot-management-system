import { Trash2 } from "lucide-react";

import { type SupplierWithValidTo } from "./SupplierTableColumns";

import { Button, Input, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui/form/label";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";

interface SupplierTableSectionProps {
  p: any;
  cols: any;
}

export function SupplierTableSection({ p, cols }: SupplierTableSectionProps) {
  const paginated = p.table.paginateData(p.sorted) as SupplierWithValidTo[];
  const pageInfo = p.table.calculatePagination(p.sorted.length);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">仕入先一覧</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive"
              checked={p.showInactive}
              onCheckedChange={(c) => p.setShowInactive(c as boolean)}
            />
            <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
              削除済みを表示
            </Label>
          </div>
          <Input
            type="search"
            placeholder="コード・名称で検索..."
            value={p.searchQuery}
            onChange={(e) => p.setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {p.selectedIds.length > 0 && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 ${p.isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
        >
          <span className={`text-sm font-medium ${p.isAdmin ? "text-red-800" : "text-amber-800"}`}>
            {p.selectedIds.length} 件選択中
          </span>
          <Button
            variant={p.isAdmin ? "destructive" : "outline"}
            size="sm"
            onClick={() => p.setIsBulkOpen(true)}
            className={!p.isAdmin ? "border-amber-600 text-amber-700 hover:bg-amber-100" : ""}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {p.isAdmin ? "一括削除" : "一括無効化"}
          </Button>
        </div>
      )}

      <DataTable
        data={paginated}
        columns={cols}
        sort={p.sort}
        onSortChange={p.setSort}
        getRowId={(r) => r.supplier_code}
        onRowClick={p.handleRowClick}
        isLoading={p.list.isLoading}
        emptyMessage="仕入先が登録されていません"
        selectable
        selectedIds={p.selectedIds}
        onSelectionChange={p.setSelectedIds}
      />
      {p.sorted.length > 0 && (
        <TablePagination
          currentPage={pageInfo.page || 1}
          pageSize={pageInfo.pageSize || 25}
          totalCount={p.sorted.length}
          onPageChange={p.table.setPage}
          onPageSizeChange={p.table.setPageSize}
          pageSizeOptions={[25, 50, 75, 100]}
        />
      )}
    </div>
  );
}
