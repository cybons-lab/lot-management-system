/**
 * InboundPlansListPage (v2.2 - Phase C-3)
 * Inbound plans list page
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  InboundPlansList,
  type InboundPlansFilters,
  type InboundPlan,
} from "../components/InboundPlansList";
import { useDeleteInboundPlan, useInboundPlans, useSyncFromSAP } from "../hooks";

import { PermanentDeleteDialog } from "@/components/common";
import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { SupplierAssignmentWarning } from "@/features/assignments/components";
import { useSupplierFilter } from "@/features/assignments/hooks";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

function buildInitialFilters(
  searchParams: URLSearchParams,
  filterEnabled: boolean,
): InboundPlansFilters {
  const getOrEmpty = (key: string) => searchParams.get(key) || "";
  return {
    supplier_id: getOrEmpty("supplier_id"),
    supplier_item_id: getOrEmpty("supplier_item_id"),
    status: (searchParams.get("status") as InboundPlansFilters["status"]) || "",
    date_from: getOrEmpty("date_from"),
    date_to: getOrEmpty("date_to"),
    prioritize_assigned: searchParams.get("prioritize_assigned") === "true" || filterEnabled,
  };
}

function buildInboundPlanQueryParams(
  filters: InboundPlansFilters,
): Parameters<typeof useInboundPlans>[0] {
  return {
    ...(filters.supplier_id ? { supplier_id: Number(filters.supplier_id) } : {}),
    ...(filters.supplier_item_id ? { supplier_item_id: Number(filters.supplier_item_id) } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- InboundPlansFilters.status と API パラメータの型が異なるため
    ...(filters.status ? { status: filters.status as any } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.prioritize_assigned ? { prioritize_assigned: filters.prioritize_assigned } : {}),
  };
}

function useInboundPlansListPageState(params: {
  navigate: ReturnType<typeof useNavigate>;
  searchParams: URLSearchParams;
  filterEnabled: boolean;
}) {
  const { navigate, searchParams, filterEnabled } = params;

  const [filters, setFilters] = useState<InboundPlansFilters>(() =>
    buildInitialFilters(searchParams, filterEnabled),
  );
  const [deletingItem, setDeletingItem] = useState<InboundPlan | null>(null);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, prioritize_assigned: filterEnabled }));
  }, [filterEnabled]);

  const queryParams = useMemo(() => buildInboundPlanQueryParams(filters), [filters]);
  const { data: plans, isLoading, isError, error, refetch } = useInboundPlans(queryParams);

  useEffect(() => {
    if (isError) {
      console.error("[InboundPlans] List fetch error:", error);
    }
  }, [isError, error]);

  const deleteMutation = useDeleteInboundPlan();
  const syncMutation = useSyncFromSAP();

  const handleDeleteClick = useCallback(
    (id: number) => {
      const plan = plans?.find((item) => item.id === id);
      if (plan) {
        setDeletingItem(plan);
      }
    },
    [plans],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem) return;

    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      refetch();
      setDeletingItem(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("削除に失敗しました");
    }
  }, [deleteMutation, deletingItem, refetch]);

  const handleViewDetail = useCallback(
    (id: number) => {
      navigate(ROUTES.INBOUND_PLANS.DETAIL(id));
    },
    [navigate],
  );

  const handleSyncFromSAP = useCallback(async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(result.message);
      refetch();
    } catch (error) {
      console.error("SAP sync failed:", error);
      toast.error("SAP同期に失敗しました");
    }
  }, [refetch, syncMutation]);

  return {
    filters,
    setFilters,
    plans,
    isLoading,
    isError,
    deletingItem,
    setDeletingItem,
    deleteMutation,
    syncMutation,
    handleDeleteClick,
    handleConfirmDelete,
    handleViewDetail,
    handleSyncFromSAP,
  };
}

export function InboundPlansListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filterEnabled, toggleFilter } = useSupplierFilter();

  const model = useInboundPlansListPageState({
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
