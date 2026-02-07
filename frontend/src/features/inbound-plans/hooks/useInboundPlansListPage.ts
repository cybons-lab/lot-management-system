import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";

import type { InboundPlansListParams } from "../api";
import type { InboundPlan, InboundPlansFilters } from "../types";

import { useDeleteInboundPlan, useInboundPlans, useSyncFromSAP } from "./index";

import { ROUTES } from "@/constants/routes";

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

function buildInboundPlanQueryParams(filters: InboundPlansFilters): InboundPlansListParams {
  return {
    ...(filters.supplier_id ? { supplier_id: Number(filters.supplier_id) } : {}),
    ...(filters.supplier_item_id ? { supplier_item_id: Number(filters.supplier_item_id) } : {}),
    ...(filters.status
      ? { status: filters.status as NonNullable<InboundPlansListParams["status"]> }
      : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.prioritize_assigned ? { prioritize_assigned: filters.prioritize_assigned } : {}),
  };
}

export function useInboundPlansListPage(params: {
  navigate: NavigateFunction;
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
