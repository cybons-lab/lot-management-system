import { useNavigate, useSearchParams } from "react-router-dom";

import { InboundPlansList } from "../components/InboundPlansList";
import { useInboundPlansListPage } from "../hooks";

import { PermanentDeleteDialog } from "@/components/common";
import { Button } from "@/components/ui";
import { SupplierAssignmentWarning } from "@/features/assignments/components";
import { useSupplierFilter } from "@/features/assignments/hooks";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function InboundPlansListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filterEnabled, toggleFilter } = useSupplierFilter();

  const model = useInboundPlansListPage({
    navigate,
    searchParams,
    filterEnabled,
  });

  return (
    <PageContainer>
      <PageHeader
        title="入荷予定一覧"
        subtitle="入荷予定管理（ロット自動生成対応）"
        actions={
          <Button onClick={model.handleSyncFromSAP} disabled={model.syncMutation.isPending}>
            {model.syncMutation.isPending ? "同期中..." : "SAPから取得"}
          </Button>
        }
      />

      <SupplierAssignmentWarning />

      <InboundPlansList
        {...(model.plans ? { plans: model.plans } : {})}
        isLoading={model.isLoading}
        isError={model.isError}
        filters={model.filters}
        onFilterChange={model.setFilters}
        onDelete={model.handleDeleteClick}
        onViewDetail={model.handleViewDetail}
        isDeleting={model.deleteMutation.isPending}
        filterEnabled={filterEnabled}
        onToggleFilter={toggleFilter}
      />

      <PermanentDeleteDialog
        open={!!model.deletingItem}
        onOpenChange={(open) => !open && model.setDeletingItem(null)}
        onConfirm={model.handleConfirmDelete}
        isPending={model.deleteMutation.isPending}
        title="入荷予定を削除しますか？"
        description={`入荷予定番号 ${model.deletingItem?.plan_number} を削除します。この操作は取り消せません。`}
        confirmationPhrase={model.deletingItem?.plan_number || "delete"}
      />
    </PageContainer>
  );
}
