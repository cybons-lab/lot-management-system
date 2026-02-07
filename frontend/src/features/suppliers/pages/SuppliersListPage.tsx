import { Truck } from "lucide-react";
import { useMemo } from "react";

import { SupplierDialogContainer } from "../components/SupplierDialogContainer";
import { createColumns } from "../components/SupplierTableColumns";
import { SupplierTableSection } from "../components/SupplierTableSection";
import { useSupplierListPage } from "../hooks/useSupplierListPage";

import { RefreshButton } from "@/components/ui";
import { QueryErrorFallback } from "@/shared/components/feedback/QueryErrorFallback";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/**
 * 仕入先マスタ一覧ページ
 */
export function SuppliersListPage() {
  const p = useSupplierListPage();
  const { dlgs, setSelectedSupplierCode } = p;
  const cols = useMemo(
    () =>
      createColumns({
        onRestore: dlgs.openRestore,
        onPermanentDelete: dlgs.openPermanentDelete,
        onEdit: (r) => setSelectedSupplierCode(r.supplier_code),
        onSoftDelete: dlgs.openSoftDelete,
      }),
    [dlgs, setSelectedSupplierCode],
  );

  const header = (
    <PageHeader
      title="仕入先マスタ"
      subtitle="仕入先の作成・編集・削除、一括インポート/エクスポート"
      backLink={{ to: "/masters", label: "マスタ管理" }}
      actions={
        <div className="flex gap-2">
          <RefreshButton
            queryKey={["suppliers", { includeInactive: p.showInactive }]}
            isLoading={p.list.isLoading}
          />
          <MasterPageActions
            exportApiPath="masters/suppliers/export/download"
            exportFilePrefix="suppliers"
            onImportClick={p.dlgs.openImport}
            onCreateClick={p.dlgs.openCreate}
          />
        </div>
      }
    />
  );

  if (p.list.isError)
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        {header}
        <QueryErrorFallback error={p.list.error} resetError={p.list.refetch} />
      </div>
    );

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {header}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">登録仕入先数</p>
              <p className="text-2xl font-bold text-blue-700">{p.list.data?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
      <SupplierTableSection p={p} cols={cols} />
      <SupplierDialogContainer p={p} />
    </div>
  );
}
