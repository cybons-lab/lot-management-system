import { useMemo } from "react";

import { CustomerActionDialogs } from "../components/CustomerActionDialogs";
import { CustomerBulkActionBar } from "../components/CustomerBulkActionBar";
import { CustomerBulkDialogs } from "../components/CustomerBulkDialogs";
import { CustomerCreateImportDialogs } from "../components/CustomerCreateImportDialogs";
import { CustomerDetailDialog } from "../components/CustomerDetailDialog";
import { CustomerListFilters } from "../components/CustomerListFilters";
import { CustomerListPageHeader } from "../components/CustomerListPageHeader";
import { CustomerListStats } from "../components/CustomerListStats";
import { createColumns, type CustomerWithValidTo } from "../components/CustomerTableColumns";
import { useCustomerListPage } from "../hooks/useCustomerListPage";

import * as styles from "./styles";

import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";

export function CustomersListPage() {
  const p = useCustomerListPage();
  const { dlgs, setSelectedCustomerCode } = p;
  const cols = useMemo(
    () =>
      createColumns({
        onRestore: dlgs.openRestore,
        onPermanentDelete: dlgs.openPermanentDelete,
        onEdit: (r) => setSelectedCustomerCode(r.customer_code),
        onSoftDelete: dlgs.openSoftDelete,
      }),
    [dlgs, setSelectedCustomerCode],
  );

  if (p.isError)
    return (
      <div className={styles.root}>
        <CustomerListPageHeader
          showInactive={p.showInactive}
          isLoading={p.isLoading}
          onImportClick={p.dlgs.openImport}
          onCreateClick={p.dlgs.openCreate}
        />
        <QueryErrorFallback error={p.error} resetError={p.refetch} />
      </div>
    );

  const paginated = p.table.paginateData(p.sorted) as CustomerWithValidTo[];
  const pageInfo = p.table.calculatePagination(p.sorted.length);

  return (
    <div className={styles.root}>
      <CustomerListPageHeader
        showInactive={p.showInactive}
        isLoading={p.isLoading}
        onImportClick={p.dlgs.openImport}
        onCreateClick={p.dlgs.openCreate}
      />
      <CustomerListStats total={p.stats.total} />
      <div className={styles.tableContainer}>
        <CustomerListFilters
          showInactive={p.showInactive}
          setShowInactive={p.setShowInactive}
          searchQuery={p.searchQuery}
          setSearchQuery={p.setSearchQuery}
        />
        <CustomerBulkActionBar
          selectedCount={p.selectedIds.length}
          isAdmin={p.isAdmin}
          onOpenBulkDelete={() => p.setIsBulkOpen(true)}
        />
        <DataTable
          data={paginated}
          columns={cols}
          sort={p.sort}
          onSortChange={p.setSort}
          getRowId={(r) => r.customer_code}
          onRowClick={p.handleRowClick}
          isLoading={p.isLoading}
          emptyMessage="なし"
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
            pageSizeOptions={[25, 50, 100]}
          />
        )}
      </div>
      <CustomerCreateImportDialogs
        isCreateOpen={p.dlgs.isCreateOpen}
        isImportOpen={p.dlgs.isImportOpen}
        isCreating={p.create.isPending}
        close={p.dlgs.close}
        handleCreate={p.handleCreate}
      />
      <CustomerActionDialogs
        dlgs={p.dlgs}
        isSDeleting={p.softDel.isPending}
        isPDeleting={p.permDel.isPending}
        isRestoring={p.rest.isPending}
        handlers={p}
      />
      <CustomerBulkDialogs
        isAdmin={p.isAdmin}
        isOpen={p.isBulkOpen}
        onOpenChange={p.setIsBulkOpen}
        count={p.selectedIds.length}
        isPending={p.isBulkDeleting}
        onConfirmP={() => p.executeBulk(p.permDel.mutateAsync, "完全削除")}
        onConfirmS={(e: any) =>
          p.executeBulk(
            (d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }),
            "無効化",
          )
        }
      />
      <CustomerDetailDialog
        customerCode={p.selectedCustomerCode}
        open={!!p.selectedCustomerCode}
        onOpenChange={(o) => !o && p.setSelectedCustomerCode(null)}
      />
    </div>
  );
}
