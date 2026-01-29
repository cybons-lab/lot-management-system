/**
 * RPA API
 * 素材納品書発行などのRPA実行APIを提供
 */

import { http } from "@/shared/api/http-client";

export interface MaterialDeliveryDocumentRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface MaterialDeliveryDocumentResponse {
  status: string;
  message: string;
  execution_time_seconds: number;
}

export interface MaterialDeliverySimpleRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface MaterialDeliverySimpleJobResponse {
  id: number;
  step: number;
  status: string;
  start_date: string;
  end_date: string;
  requested_at: string;
  requested_by: string | null;
  completed_at: string | null;
  result_message: string | null;
  error_message: string | null;
}

/**
 * SAP Order Entry (RPA)
 */
export interface SapOrderEntryStartResponse {
  job_id: string;
  target_count: number;
  launch_url?: string;
}

/**
 * 素材納品書発行を実行
 */
export async function executeMaterialDeliveryDocument(
  request: MaterialDeliveryDocumentRequest,
): Promise<MaterialDeliveryDocumentResponse> {
  return http.post<MaterialDeliveryDocumentResponse>("rpa/material-delivery-document", request);
}

export async function executeMaterialDeliveryStep1(
  request: MaterialDeliverySimpleRequest,
): Promise<MaterialDeliverySimpleJobResponse> {
  return http.post<MaterialDeliverySimpleJobResponse>(
    "rpa/material-delivery-simple/step1",
    request,
  );
}

export async function executeMaterialDeliveryStep2(
  request: MaterialDeliverySimpleRequest,
): Promise<MaterialDeliverySimpleJobResponse> {
  return http.post<MaterialDeliverySimpleJobResponse>(
    "rpa/material-delivery-simple/step2",
    request,
  );
}

export async function getMaterialDeliverySimpleHistory(
  limit = 20,
  offset = 0,
): Promise<MaterialDeliverySimpleJobResponse[]> {
  return http.get<MaterialDeliverySimpleJobResponse[]>(
    `rpa/material-delivery-simple/history?limit=${limit}&offset=${offset}`,
  );
}

export async function deleteMaterialDeliverySimpleHistory(id: number): Promise<void> {
  return http.delete(`rpa/material-delivery-simple/history/${id}`);
}

export interface GenericCloudFlowExecuteRequest {
  flow_url: string;
  json_payload?: Record<string, unknown>;
}

export async function executeGenericCloudFlow(
  request: GenericCloudFlowExecuteRequest,
): Promise<unknown> {
  return http.post("rpa/cloud-flow/execute-generic", request);
}

export interface CloudFlowConfigResponse {
  id: number;
  config_key: string;
  config_value: string;
  description: string | null;
}

export interface CloudFlowConfigUpdate {
  config_value: string;
  description?: string | null;
}

export async function getCloudFlowConfig(key: string): Promise<CloudFlowConfigResponse> {
  return http.get<CloudFlowConfigResponse>(`rpa/cloud-flow/configs/${key}`);
}

export async function getCloudFlowConfigOptional(
  key: string,
): Promise<CloudFlowConfigResponse | null> {
  // optional=trueパラメータを渡すことで、未設定時に404ではなくnullを返す
  return http
    .get<CloudFlowConfigResponse | null>(`rpa/cloud-flow/configs/${key}`, {
      searchParams: { optional: "true" },
    })
    .then((response) => response ?? null);
}

export async function updateCloudFlowConfig(
  key: string,
  data: CloudFlowConfigUpdate,
): Promise<CloudFlowConfigResponse> {
  return http.put<CloudFlowConfigResponse>(`rpa/cloud-flow/configs/${key}`, data);
}

/**
 * SAP Order Entry RPA Start
 */
export async function executeSapOrderEntryStart(
  ids: number[],
): Promise<SapOrderEntryStartResponse> {
  return http.post<SapOrderEntryStartResponse>("rpa/sap/orders/start", { ids });
}
