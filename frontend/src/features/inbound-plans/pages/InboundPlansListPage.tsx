/**
 * InboundPlansListPage (v2.2 - Phase C-3)
 * Inbound plans list page
 */

import { Info } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  InboundPlansList,
  type InboundPlansFilters,
  type InboundPlan,
} from "../components/InboundPlansList";
import { useInboundPlans, useDeleteInboundPlan, useSyncFromSAP } from "../hooks";

import { PermanentDeleteDialog } from "@/components/common";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useMySuppliers } from "@/features/assignments/hooks/useMySuppliers";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

// eslint-disable-next-line max-lines-per-function, complexity
export function InboundPlansListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 担当仕入先を取得
  const { data: mySuppliers } = useMySuppliers();
  const hasAssignedSuppliers = (mySuppliers?.primary_supplier_ids?.length ?? 0) > 0;

  const [filters, setFilters] = useState<InboundPlansFilters>({
    supplier_id: searchParams.get("supplier_id") || "",
    product_group_id: searchParams.get("product_group_id") || "",
    status: (searchParams.get("status") as InboundPlansFilters["status"]) || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    prioritize_primary: searchParams.get("prioritize_primary") === "true" || hasAssignedSuppliers,
  });

  // 削除ダイアログの状態
  const [deletingItem, setDeletingItem] = useState<InboundPlan | null>(null);

  // Build query params
  const queryParams = {
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    product_group_id: filters.product_group_id ? Number(filters.product_group_id) : undefined,
    status: filters.status || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    prioritize_primary: filters.prioritize_primary || undefined,
  };

  // Fetch inbound plans
  const { data: plans, isLoading, isError, error, refetch } = useInboundPlans(queryParams);

  if (isError) {
    console.error("[InboundPlans] List fetch error:", error);
  }

  // Delete mutation
  const deleteMutation = useDeleteInboundPlan();

  // SAP sync mutation
  const syncMutation = useSyncFromSAP();

  const handleDeleteClick = (id: number) => {
    const plan = plans?.find((p) => p.id === id);
    if (plan) {
      setDeletingItem(plan);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      refetch();
      setDeletingItem(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("削除に失敗しました");
    }
  };

  const handleViewDetail = (id: number) => {
    navigate(ROUTES.INBOUND_PLANS.DETAIL(id));
  };

  const handleSyncFromSAP = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(result.message);
      refetch();
    } catch (error) {
      console.error("SAP sync failed:", error);
      toast.error("SAP同期に失敗しました");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="入荷予定一覧"
        subtitle="入荷予定管理（ロット自動生成対応）"
        actions={
          <Button onClick={handleSyncFromSAP} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? "同期中..." : "SAPから取得"}
          </Button>
        }
      />

      {!hasAssignedSuppliers && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>担当仕入先が設定されていません</AlertTitle>
          <AlertDescription>
            担当する仕入先を設定すると、自動的にフィルタが適用されます。
            <Link to="/settings/account" className="ml-2 underline">
              アカウント設定で担当仕入先を設定
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <InboundPlansList
        plans={plans}
        isLoading={isLoading}
        isError={isError}
        filters={filters}
        onFilterChange={setFilters}
        onDelete={handleDeleteClick}
        onViewDetail={handleViewDetail}
        isDeleting={deleteMutation.isPending}
      />

      <PermanentDeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        title="入荷予定を削除しますか？"
        description={`入荷予定番号 ${deletingItem?.plan_number} を削除します。この操作は取り消せません。`}
        confirmationPhrase={deletingItem?.plan_number || "delete"}
      />
    </PageContainer>
  );
}
