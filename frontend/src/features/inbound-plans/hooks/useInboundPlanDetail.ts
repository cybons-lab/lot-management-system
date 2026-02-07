/**
 * useInboundPlanDetail - Custom hook for inbound plan detail page logic.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useInboundPlan, useUpdateInboundPlan } from "../hooks";

import { ROUTES } from "@/constants/routes";
import { useReceiveInboundPlan } from "@/shared/hooks/useInboundPlans";
import type { components } from "@/types/api";

type InboundPlanDetailResponse = components["schemas"]["InboundPlanDetailResponse"];
type InboundPlanLineResponse = components["schemas"]["InboundPlanLineResponse"];

interface ExtendedInboundPlanLine extends InboundPlanLineResponse {
  product_name?: string;
  product_code?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  notes?: string;
  line_number?: number;
  warehouse_id?: number;
}

export interface ExtendedInboundPlan extends InboundPlanDetailResponse {
  supplier_name?: string;
  lines: ExtendedInboundPlanLine[];
}

export function useInboundPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planId = Number(id);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch inbound plan with lines
  const { data: rawPlan, isLoading, isError, refetch } = useInboundPlan(planId);
  const plan = rawPlan as unknown as ExtendedInboundPlan | undefined;

  const receiveMutation = useReceiveInboundPlan();
  const updateMutation = useUpdateInboundPlan(planId);

  const handleBack = () => {
    navigate(ROUTES.INBOUND_PLANS.LIST);
  };

  const handleReceive = async (data: {
    lots: { expected_lot_id: number; lot_number: string }[];
  }) => {
    try {
      const lot_numbers = data.lots.reduce(
        (acc, lot) => ({
          ...acc,
          [lot.expected_lot_id]: lot.lot_number,
        }),
        {} as Record<string, string>,
      );

      await receiveMutation.mutateAsync({
        planId,
        data: {
          received_at: new Date().toISOString(),
          lot_numbers,
        },
      });

      toast.success("入庫確定しました");
      setIsReceiveDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to receive inbound plan:", error);
      toast.error("入庫確定に失敗しました");
      throw error;
    }
  };

  const handleUpdate = async (data: { planned_arrival_date: string; notes?: string }) => {
    try {
      await updateMutation.mutateAsync({
        planned_arrival_date: data.planned_arrival_date,
        ...(data.notes ? { notes: data.notes } : {}),
      });
      toast.success("入荷予定を更新しました");
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to update inbound plan:", error);
      toast.error("更新に失敗しました");
      throw error;
    }
  };

  return {
    plan,
    isLoading,
    isError,
    isReceiveDialogOpen,
    setIsReceiveDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    handleBack,
    handleReceive,
    handleUpdate,
  };
}
