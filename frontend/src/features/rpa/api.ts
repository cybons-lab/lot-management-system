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

/**
 * 素材納品書発行を実行
 */
export async function executeMaterialDeliveryDocument(
  request: MaterialDeliveryDocumentRequest,
): Promise<MaterialDeliveryDocumentResponse> {
  return http.post<MaterialDeliveryDocumentResponse>("rpa/material-delivery-document", request);
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

export async function updateCloudFlowConfig(
  key: string,
  data: CloudFlowConfigUpdate,
): Promise<CloudFlowConfigResponse> {
  return http.put<CloudFlowConfigResponse>(`rpa/cloud-flow/configs/${key}`, data);
}
