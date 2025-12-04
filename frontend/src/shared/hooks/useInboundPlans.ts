// Inbound Plans hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as inboundPlansApi from "../api/inbound-plans";

import type { components } from "@/types/api";

type InboundPlanDetailResponse = components["schemas"]["InboundPlanDetailResponse"];
type InboundPlanReceiveRequest = components["schemas"]["InboundPlanReceiveRequest"];
type InboundPlanReceiveResponse = components["schemas"]["InboundPlanReceiveResponse"];

/**
 * 入庫予定詳細を取得するフック
 */
export function useInboundPlan(planId: number) {
  return useQuery<InboundPlanDetailResponse, Error>({
    queryKey: ["inbound-plans", planId],
    queryFn: () => inboundPlansApi.getInboundPlan(planId),
    enabled: !!planId,
  });
}

/**
 * 入庫確定するフック
 */
export function useReceiveInboundPlan() {
  const queryClient = useQueryClient();

  return useMutation<
    InboundPlanReceiveResponse,
    Error,
    { planId: number; data: InboundPlanReceiveRequest }
  >({
    mutationFn: ({ planId, data }) => inboundPlansApi.receiveInboundPlan(planId, data),
    onSuccess: (_, variables) => {
      // 入庫予定の詳細とリストを無効化
      queryClient.invalidateQueries({ queryKey: ["inbound-plans", variables.planId] });
      queryClient.invalidateQueries({ queryKey: ["inbound-plans"] });
      // 在庫も無効化（新しいロットが作成されたため）
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
