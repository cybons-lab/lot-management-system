/**
 * InboundPlansListPage (v2.2 - Phase C-3)
 * Inbound plans list page
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { InboundPlansList, type InboundPlansFilters } from "../components/InboundPlansList";
import { useInboundPlans, useDeleteInboundPlan } from "../hooks";

import { ROUTES } from "@/constants/routes";

export function InboundPlansListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InboundPlansFilters>({
    supplier_id: "",
    status: "",
    date_from: "",
    date_to: "",
  });

  // Build query params
  const queryParams = {
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    status: filters.status || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  };

  // Fetch inbound plans
  const { data: plans, isLoading, isError, refetch } = useInboundPlans(queryParams);

  // Delete mutation
  const deleteMutation = useDeleteInboundPlan();

  const handleDelete = async (id: number) => {
    if (!confirm("この入荷予定を削除しますか？")) return;

    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました");
    }
  };

  const handleViewDetail = (id: number) => {
    navigate(ROUTES.INBOUND_PLANS.DETAIL(id));
  };

  return (
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
  );
}
