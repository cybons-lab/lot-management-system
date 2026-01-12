/**
 * InboundPlansListPage (v2.2 - Phase C-3)
 * Inbound plans list page
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { InboundPlansList, type InboundPlansFilters } from "../components/InboundPlansList";
import { useInboundPlans, useDeleteInboundPlan, useSyncFromSAP } from "../hooks";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

/* eslint-disable-next-line complexity */
export function InboundPlansListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<InboundPlansFilters>({
    supplier_id: searchParams.get("supplier_id") || "",
    product_id: searchParams.get("product_id") || "",
    status: (searchParams.get("status") as InboundPlansFilters["status"]) || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    prioritize_primary: searchParams.get("prioritize_primary") === "true",
  });

  // Build query params
  const queryParams = {
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
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

  const handleDelete = async (id: number) => {
    if (!confirm("この入荷予定を削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync(id);
      refetch();
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
      <InboundPlansList
        plans={plans}
        isLoading={isLoading}
        isError={isError}
        filters={filters}
        onFilterChange={setFilters}
        onDelete={handleDelete}
        onViewDetail={handleViewDetail}
        isDeleting={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
