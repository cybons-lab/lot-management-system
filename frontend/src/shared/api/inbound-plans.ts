// Inbound Plans API functions
import type { components } from "../types/openapi";

import { fetchApi } from "@/shared/libs/http";

type InboundPlanDetailResponse = components["schemas"]["InboundPlanDetailResponse"];
type InboundPlanReceiveRequest = components["schemas"]["InboundPlanReceiveRequest"];
type InboundPlanReceiveResponse = components["schemas"]["InboundPlanReceiveResponse"];

/**
 * 入庫予定詳細を取得
 */
export async function getInboundPlan(planId: number): Promise<InboundPlanDetailResponse> {
  return fetchApi.get<InboundPlanDetailResponse>(`/inbound-plans/${planId}`);
}

/**
 * 入庫確定
 */
export async function receiveInboundPlan(
  planId: number,
  data: InboundPlanReceiveRequest,
): Promise<InboundPlanReceiveResponse> {
  return fetchApi.post<InboundPlanReceiveResponse>(`/inbound-plans/${planId}/receive`, data);
}
