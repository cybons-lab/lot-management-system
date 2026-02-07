import { Truck, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { SupplierDialogContainer } from "../components/SupplierDialogContainer";
import { createColumns } from "../components/SupplierTableColumns";
import { useSupplierListPage } from "../hooks/useSupplierListPage";

import { Button, Checkbox, Label, RefreshButton } from "@/components/ui";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { MasterPageTemplate } from "@/shared/components/layout/MasterPageTemplate";

/**
 * 仕入先マスタ一覧ページ
 */
// eslint-disable-next-line max-lines-per-function -- 仕入先マスタ一覧ページの関連ロジックを1箇所で管理するため
export function SuppliersListPage() {
  const p = useSupplierListPage();
  const { setSelectedSupplierCode, table, showInactive, setShowInactive, dlgs } = p;

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

  const { paginated, sorted, pageInfo } = p.processData(p.list.data);

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
        <div className="group rounded-xl border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50/50 p-5 shadow-sm transition-all duration-200 hover:shadow-md min-w-[240px]">
          <div className="flex items-center gap-4">
            <Truck className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-600 whitespace-nowrap">登録仕入先数</p>
              <p className="mt-1 text-3xl font-bold text-blue-700">{p.list.data?.length ?? 0}</p>
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
          <Label
            htmlFor="show-inactive"
            className="cursor-pointer text-sm font-normal text-slate-600"
          >
            削除済みを表示
          </Label>
        </div>
      }
      beforeTable={
        p.selectedIds.length > 0 && (
          <div
            className={`flex items-center justify-between rounded-lg border p-3 ${p.isAdmin ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
          >
            <span
              className={`text-sm font-medium ${p.isAdmin ? "text-red-800" : "text-amber-800"}`}
            >
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
