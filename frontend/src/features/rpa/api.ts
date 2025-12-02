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
