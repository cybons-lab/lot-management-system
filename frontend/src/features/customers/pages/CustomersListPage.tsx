import { useMemo } from "react";

import { CustomerDialogContainer } from "../components/CustomerDialogContainer";
import { CustomerListPageHeader } from "../components/CustomerListPageHeader";
import { CustomerListStats } from "../components/CustomerListStats";
import { createColumns, type CustomerWithValidTo } from "../components/CustomerTableColumns";
import { CustomerTableSection } from "../components/CustomerTableSection";
import { useCustomerListPage } from "../hooks/useCustomerListPage";

import * as styles from "./styles";

import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";

/**
 * 得意先マスタ一覧ページ
 */
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

  const header = (
    <CustomerListPageHeader
      showInactive={p.showInactive}
      isLoading={p.isLoading}
      onImportClick={p.dlgs.openImport}
      onCreateClick={p.dlgs.openCreate}
    />
  );

  if (p.isError)
    return (
      <div className={styles.root}>
        {header}
        <QueryErrorFallback error={p.error} resetError={p.refetch} />
      </div>
    );

  const paginated = p.table.paginateData(p.sorted) as CustomerWithValidTo[];
  const pageInfo = p.table.calculatePagination(p.sorted.length);

  return (
    <div className={styles.root}>
      {header}
      <CustomerListStats total={p.stats.total} />
      <CustomerTableSection p={p} cols={cols} paginated={paginated} pageInfo={pageInfo} />
      <CustomerDialogContainer p={p} />
    </div>
  );
}
