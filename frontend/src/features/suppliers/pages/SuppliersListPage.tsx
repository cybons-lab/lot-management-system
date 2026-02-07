import { Truck, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { SupplierDialogContainer } from "../components/SupplierDialogContainer";
import { createColumns } from "../components/SupplierTableColumns";
import { useSupplierListPage } from "../hooks/useSupplierListPage";

import { Button, Checkbox, Label, RefreshButton } from "@/components/ui";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { MasterPageTemplate } from "@/shared/components/layout/MasterPageTemplate";
import { TablePagination } from "@/shared/components/data/TablePagination";

/**
 * 仕入先マスタ一覧ページ
 */
export function SuppliersListPage() {
  const p = useSupplierListPage();
  const { dlgs, setSelectedSupplierCode, table, sorted, showInactive, setShowInactive } = p;

  const columns = useMemo(
    () =>
      createColumns({
        onRestore: dlgs.openRestore,
        onPermanentDelete: dlgs.openPermanentDelete,
        onEdit: (r) => setSelectedSupplierCode(r.supplier_code),
        onSoftDelete: dlgs.openSoftDelete,
      }),
    [dlgs, setSelectedSupplierCode],
  );

  const paginated = table.paginateData(sorted);
  const pageInfo = table.calculatePagination(sorted.length);

  return (
    <MasterPageTemplate
      header={{
        title: "仕入先マスタ",
        subtitle: "仕入先の作成・編集・削除、一括インポート/エクスポート",
        backLink: { to: "/masters", label: "マスタ管理" },
      }}
      headerActions={
        <div className="flex gap-2">
          <RefreshButton
            queryKey={["suppliers", { includeInactive: showInactive }]}
            isLoading={p.list.isLoading}
          />
          <MasterPageActions
            exportApiPath="masters/suppliers/export/download"
            exportFilePrefix="suppliers"
            onImportClick={dlgs.openImport}
            onCreateClick={dlgs.openCreate}
          />
        </div>
      }
      stats={
        <div className="rounded-lg border bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">登録仕入先数</p>
              <p className="text-2xl font-bold text-blue-700">{p.list.data?.length ?? 0}</p>
            </div>
          </div>
        </div>
      }
      tableTitle="仕入先一覧"
      searchQuery={p.searchQuery}
      onSearchQueryChange={p.setSearchQuery}
      searchPlaceholder="コード・名称で検索..."
      leftToolbarControls={
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(c) => setShowInactive(c as boolean)}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm font-normal text-slate-600">
            削除済みを表示
          </Label>
        </div>
      }
      beforeTable={
        p.selectedIds.length > 0 && (
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
        )
      }
      data={paginated}
      columns={columns}
      sort={p.sort}
      onSortChange={p.setSort}
      getRowId={(r) => r.supplier_code}
      onRowClick={p.handleRowClick}
      isLoading={p.list.isLoading}
      emptyMessage="仕入先が登録されていません"
      selectable
      selectedIds={p.selectedIds}
      onSelectionChange={p.setSelectedIds}
      afterTable={
        sorted.length > 0 && (
          <TablePagination
            currentPage={pageInfo.page || 1}
            pageSize={pageInfo.pageSize || 25}
            totalCount={sorted.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            pageSizeOptions={[25, 50, 75, 100]}
          />
        )
      }
      dialogContext={<SupplierDialogContainer p={p} />}
    />
  );
}
