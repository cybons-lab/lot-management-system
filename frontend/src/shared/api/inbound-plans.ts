// Inbound Plans API functions
import type { components } from '../types/openapi';

import { apiClient } from './client';

type InboundPlanDetailResponse = components['schemas']['InboundPlanDetailResponse'];
type InboundPlanReceiveRequest = components['schemas']['InboundPlanReceiveRequest'];
type InboundPlanReceiveResponse = components['schemas']['InboundPlanReceiveResponse'];

/**
 * 入庫予定詳細を取得
 */
export async function getInboundPlan(planId: number): Promise<InboundPlanDetailResponse> {
    const response = await apiClient.GET('/api/inbound-plans/{plan_id}', {
        params: { path: { plan_id: planId } },
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch inbound plan');
    }
    return response.data;
}

/**
 * 入庫確定
 */
export async function receiveInboundPlan(
    planId: number,
    data: InboundPlanReceiveRequest
): Promise<InboundPlanReceiveResponse> {
    const response = await apiClient.POST('/api/inbound-plans/{plan_id}/receive', {
        params: { path: { plan_id: planId } },
        body: data,
    });
    if (response.error) {
        throw new Error(response.error.detail || 'Failed to receive inbound plan');
    }
    return response.data;
}
