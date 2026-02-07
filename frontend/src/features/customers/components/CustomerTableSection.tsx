import { CustomerBulkActionBar } from "../components/CustomerBulkActionBar";
import { CustomerListFilters } from "../components/CustomerListFilters";
import { type CustomerWithValidTo } from "../components/CustomerTableColumns";
import * as styles from "../pages/styles";

import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";

interface CustomerTableSectionProps {
  p: any;
  cols: any;
  paginated: CustomerWithValidTo[];
  pageInfo: any;
}

export function CustomerTableSection({ p, cols, paginated, pageInfo }: CustomerTableSectionProps) {
  return (
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
  );
}
