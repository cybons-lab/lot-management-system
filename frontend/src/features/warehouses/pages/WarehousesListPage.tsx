import { Warehouse as WarehouseIcon, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { WarehouseDialogContainer } from "../components/WarehouseDialogContainer";
import { useWarehouseListPage } from "../hooks/useWarehouseListPage";
import { createWarehouseColumns } from "./columns";
import * as styles from "./styles";

import { Button, Checkbox, Label } from "@/components/ui";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { MasterPageTemplate } from "@/shared/components/layout/MasterPageTemplate";

/**
 * 倉庫マスタ一覧ページ
 */
export function WarehousesListPage() {
  const p = useWarehouseListPage();
  const { dlgs, setSelectedWarehouseCode, showInactive, setShowInactive, sorted } = p;

  const columns = useMemo(
    () =>
      createWarehouseColumns({
        onRestore: dlgs.openRestore,
        onPermanentDelete: dlgs.openPermanentDelete,
        onEdit: (r) => setSelectedWarehouseCode(r.warehouse_code),
        onSoftDelete: dlgs.openSoftDelete,
      }),
    [dlgs, setSelectedWarehouseCode],
  );

  return (
    <MasterPageTemplate
      header={{
        title: "倉庫マスタ",
        subtitle: "倉庫の作成・編集・削除、一括インポート/エクスポート",
        backLink: { to: "/masters", label: "マスタ管理" },
      }}
      headerActions={
        <MasterPageActions
          exportApiPath="masters/warehouses/export/download"
          exportFilePrefix="warehouses"
          onImportClick={dlgs.openImport}
          onCreateClick={dlgs.openCreate}
        />
      }
      stats={
        <div className={styles.statsCard({ variant: "blue" })}>
          <div className="flex items-center gap-3">
            <WarehouseIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className={styles.statsLabel}>登録倉庫数</p>
              <p className={styles.statsValue({ color: "blue" })}>{p.list.data?.length ?? 0}</p>
            </div>
          </div>
        </div>
      }
      tableTitle="倉庫一覧"
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
      data={sorted}
      columns={columns}
      sort={p.sort}
      onSortChange={p.setSort}
      getRowId={(r) => r.warehouse_code}
      onRowClick={p.handleRowClick}
      isLoading={p.list.isLoading}
      emptyMessage="倉庫が登録されていません"
      selectable
      selectedIds={p.selectedIds}
      onSelectionChange={p.setSelectedIds}
      dialogContext={<WarehouseDialogContainer p={p} />}
    />
  );
}
