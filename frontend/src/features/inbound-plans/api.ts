/**
 * Inbound Plans API Client (v2.2 - Phase C)
 * 入荷予定管理（ロット自動生成対応）
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Inbound Plan Header
 */
export interface InboundPlan {
  id: number;
  plan_number: string;
  supplier_id: number;
  planned_arrival_date: string;
  status: "planned" | "partially_received" | "received" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  supplier_name?: string;
  /** Sum of planned_quantity from all lines */
  total_quantity?: number;
}

/**
 * Inbound Plan Line
 */
export interface InboundPlanLine {
  id: number;
  inbound_plan_id: number;
  line_number: number;
  supplier_item_id: number;
  quantity: number;
  warehouse_id: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional)
  product_code?: string;
  product_name?: string;
  warehouse_name?: string;
}

/**
 * Inbound Plan with Lines
 */
export interface InboundPlanWithLines extends InboundPlan {
  lines: InboundPlanLine[];
}

/**
 * Inbound Plans List Response (matches backend ListResponse)
 */
export interface InboundPlanListResponse {
  items: InboundPlan[];
  total: number;
}

/**
 * Request types
 */
export interface CreateInboundPlanRequest {
  plan_number: string;
  supplier_id: number;
  planned_arrival_date: string;
  status?: "planned" | "partially_received" | "received" | "cancelled";
  notes?: string;
  lines?: CreateInboundPlanLineRequest[];
}

export interface UpdateInboundPlanRequest {
  plan_number?: string;
  supplier_id?: number;
  planned_arrival_date?: string;
  status?: "planned" | "partially_received" | "received" | "cancelled";
  notes?: string;
}

export interface CreateInboundPlanLineRequest {
  line_number?: number;
  supplier_item_id: number;
  quantity: number;
  warehouse_id: number;
  notes?: string;
}

export interface UpdateInboundPlanLineRequest {
  line_number?: number;
  supplier_item_id?: number;
  quantity?: number;
  warehouse_id?: number;
  notes?: string;
}

/**
 * Receive Inbound Request (重要: ロット自動生成)
 */
export interface ReceiveInboundRequest {
  lines: {
    inbound_plan_line_id: number;
    received_quantity: number;
  }[];
}

/**
 * Receive Inbound Response (生成されたロット情報)
 */
export interface ReceiveInboundResponse {
  generated_lots: {
    lot_id: number;
    lot_number: string;
    supplier_item_id: number;
    quantity: number;
    warehouse_id: number;
  }[];
}

export interface InboundPlansListParams {
  skip?: number;
  limit?: number;
  supplier_id?: number;
  supplier_item_id?: number;
  status?: "planned" | "partially_received" | "received" | "cancelled";
  date_from?: string;
  date_to?: string;
  prioritize_primary?: boolean;
  prioritize_assigned?: boolean;
}

// ===== API Functions =====

/**
 * クエリパラメータを構築するヘルパー
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? "?" + queryString : "";
}

/**
 * Get inbound plans list
 * @endpoint GET /inbound-plans
 */
export const getInboundPlans = async (params?: InboundPlansListParams) => {
  const queryString = buildQueryParams(params ?? {});
  const response = await http.get<InboundPlanListResponse>(`inbound-plans${queryString}`);
  // Return items array for compatibility with existing hooks
  return response.items;
};

/**
 * Get inbound plan detail (with lines)
 * @endpoint GET /inbound-plans/{id}
 */
export const getInboundPlan = (id: number) => {
  return http.get<InboundPlanWithLines>(`inbound-plans/${id}`);
};

/**
 * Create inbound plan (with optional lines)
 * @endpoint POST /inbound-plans
 */
export const createInboundPlan = (data: CreateInboundPlanRequest) => {
  return http.post<InboundPlan>("inbound-plans", data);
};

/**
 * Update inbound plan
 * @endpoint PUT /inbound-plans/{id}
 */
export const updateInboundPlan = (id: number, data: UpdateInboundPlanRequest) => {
  return http.put<InboundPlan>(`inbound-plans/${id}`, data);
};

/**
 * Delete inbound plan
 * @endpoint DELETE /inbound-plans/{id}
 */
export const deleteInboundPlan = (id: number) => {
  return http.delete<void>(`inbound-plans/${id}`);
};

/**
 * Get inbound plan lines
 * @endpoint GET /inbound-plans/{id}/lines
 */
export const getInboundPlanLines = (planId: number) => {
  return http.get<InboundPlanLine[]>(`inbound-plans/${planId}/lines`);
};

/**
 * Add inbound plan line
 * @endpoint POST /inbound-plans/{id}/lines
 */
export const createInboundPlanLine = (planId: number, data: CreateInboundPlanLineRequest) => {
  return http.post<InboundPlanLine>(`inbound-plans/${planId}/lines`, data);
};

/**
 * Record inbound receipt (auto-generate lots)
 * @endpoint POST /inbound-plans/{id}/receive
 * @important This endpoint automatically generates lots based on received quantities
 */
export const receiveInbound = (planId: number, data: ReceiveInboundRequest) => {
  return http.post<ReceiveInboundResponse>(`inbound-plans/${planId}/receive`, data);
};

/**
 * SAP Sync Response
 */
export interface SAPSyncResponse {
  success: boolean;
  message: string;
  created_plans: InboundPlanWithLines[];
  skipped_count: number;
}

/**
 * Sync purchase orders from SAP (mock)
 * @endpoint POST /inbound-plans/sync-from-sap
 * @note Currently uses mock data. Will be replaced with actual SAP integration.
 */
export const syncFromSAP = () => {
  return http.post<SAPSyncResponse>("inbound-plans/sync-from-sap", {});
};
