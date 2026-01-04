/**
 * Material Delivery Note API
 * 素材納品書発行のAPIクライアント
 */

import { http } from "@/shared/api/http-client";

// Types
export interface RpaRunItem {
  id: number;
  row_no: number;
  status: string | null;
  // フィールド名統一: jiku_code (表示名: 出荷先)
  jiku_code: string | null;
  destination?: string | null; // 後方互換用alias
  layer_code: string | null;
  // フィールド名統一: external_product_code (表示名: 材質コード)
  external_product_code: string | null;
  material_code?: string | null; // 後方互換用alias
  delivery_date: string | null;
  delivery_quantity: number | null;
  shipping_vehicle: string | null;
  issue_flag: boolean;
  complete_flag: boolean;
  match_result: boolean | null;
  sap_registered: boolean | null;
  order_no: string | null;
  maker_name: string | null;
  result_status: string | null;
  lock_flag: boolean;
  item_no: string | null;
  lot_no: string | null;
}

export interface RpaRun {
  id: number;
  rpa_type: string;
  status: string;
  started_at: string | null;
  started_by_user_id: number | null;
  started_by_username: string | null;
  step2_executed_at: string | null;
  step2_executed_by_user_id: number | null;
  step2_executed_by_username: string | null;
  external_done_at: string | null;
  external_done_by_username: string | null;
  step4_executed_at: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  complete_count: number;
  issue_count: number;
  all_items_complete: boolean;
  items: RpaRunItem[];
}

export interface RpaRunSummary {
  id: number;
  rpa_type: string;
  status: string;
  data_start_date: string | null;
  data_end_date: string | null;
  started_at: string | null;
  started_by_username: string | null;
  step2_executed_at: string | null;
  external_done_at: string | null;
  step4_executed_at: string | null;
  created_at: string;
  item_count: number;
  complete_count: number;
  issue_count: number;
  all_items_complete: boolean;
}

export interface RpaRunListResponse {
  runs: RpaRunSummary[];
  total: number;
}

export interface RpaRunCreateResponse {
  id: number;
  status: string;
  item_count: number;
  message: string;
}

export interface Step2ExecuteResponse {
  status: string;
  message: string;
  executed_at: string;
  flow_response: Record<string, unknown> | null;
}

export interface Step2ExecuteRequest {
  flow_url?: string;
  json_payload?: string;
  start_date?: string;
  end_date?: string;
}

export interface MaterialDeliveryNoteExecuteRequest {
  flow_url: string;
  json_payload: string;
  start_date: string;
  end_date: string;
}

export interface MaterialDeliveryNoteExecuteResponse {
  status: string;
  message: string;
  flow_response: Record<string, unknown> | null;
}

// ロット候補関連の型
export interface LotCandidate {
  lot_id: number;
  lot_number: string;
  available_qty: number;
  expiry_date: string | null;
  received_date: string | null;
  supplier_name: string | null;
}

export interface LotSuggestionsResponse {
  lots: LotCandidate[];
  auto_selected: string | null;
  source: "customer_item" | "product_only" | "none";
}

// API Functions

/**
 * Run作成 (CSVアップロード)
 */
export async function createRun(file: File, importType = "material_delivery_note") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", importType);

  return http.postFormData<RpaRunCreateResponse>("rpa/material-delivery-note/runs", formData);
}

/**
 * Run一覧を取得
 */
export async function getRuns(skip = 0, limit = 100): Promise<RpaRunListResponse> {
  return http.get<RpaRunListResponse>(
    `rpa/material-delivery-note/runs?skip=${skip}&limit=${limit}`,
  );
}

/**
 * Run詳細を取得
 */
export async function getRun(runId: number): Promise<RpaRun> {
  return http.get<RpaRun>(`rpa/material-delivery-note/runs/${runId}`);
}

/**
 * Itemを更新（issue_flag / complete_flag / lot_no）
 */
export async function updateItem(
  runId: number,
  itemId: number,
  data: {
    issue_flag?: boolean;
    complete_flag?: boolean;
    delivery_quantity?: number;
    lot_no?: string;
  },
): Promise<RpaRunItem> {
  return http.patch<RpaRunItem>(`rpa/material-delivery-note/runs/${runId}/items/${itemId}`, data);
}

/**
 * 指定したItemsを一括更新する
 */
export async function batchUpdateItems(
  runId: number,
  itemIds: number[],
  data: {
    issue_flag?: boolean;
    complete_flag?: boolean;
    delivery_quantity?: number;
  },
): Promise<RpaRun> {
  return http.post<RpaRun>(`rpa/material-delivery-note/runs/${runId}/items/batch-update`, {
    item_ids: itemIds,
    update_data: data,
  });
}

/**
 * 全Itemsを完了にする
 */
export async function completeAllItems(runId: number): Promise<RpaRun> {
  return http.post<RpaRun>(`rpa/material-delivery-note/runs/${runId}/complete-all`, {});
}

/**
 * Step2を実行
 */
export async function executeStep2(
  runId: number,
  request: Step2ExecuteRequest,
): Promise<Step2ExecuteResponse> {
  return http.post<Step2ExecuteResponse>(`rpa/material-delivery-note/runs/${runId}/step2`, request);
}

/**
 * Power Automateフローを呼び出して素材納品書発行を実行
 */
export async function executeMaterialDeliveryNote(
  request: MaterialDeliveryNoteExecuteRequest,
): Promise<MaterialDeliveryNoteExecuteResponse> {
  return http.post<MaterialDeliveryNoteExecuteResponse>(
    "rpa/material-delivery-note/execute",
    request,
  );
}

/**
 * 外部手順完了をマーク
 */
export async function markExternalDone(runId: number): Promise<RpaRun> {
  return http.post<RpaRun>(`rpa/material-delivery-note/runs/${runId}/external-done`, {});
}

/**
 * Step4: 突合チェック実行
 */
export async function executeStep4Check(
  runId: number,
  file: File,
): Promise<{ match: number; mismatch: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return http.postFormData<{ match: number; mismatch: number }>(
    `rpa/material-delivery-note/runs/${runId}/step4-check`,
    formData,
  );
}

/**
 * Step4 NGアイテムの再実行
 */
export async function retryFailedItems(runId: number): Promise<RpaRun> {
  return http.post<RpaRun>(`rpa/material-delivery-note/runs/${runId}/retry-failed`, {});
}

/**
 * Step4完了
 */
export async function completeStep4(runId: number): Promise<RpaRun> {
  return http.post<RpaRun>(`rpa/material-delivery-note/runs/${runId}/step4-complete`, {});
}

/**
 * ロット候補を取得
 * 疎結合対応: マスタがなくてもエラーにならない
 */
export async function getLotSuggestions(
  runId: number,
  itemId: number,
): Promise<LotSuggestionsResponse> {
  return http.get<LotSuggestionsResponse>(
    `rpa/material-delivery-note/runs/${runId}/items/${itemId}/lot-suggestions`,
  );
}

// Layer Codes
export interface LayerCodeMapping {
  layer_code: string;
  maker_name: string;
  created_at: string;
  updated_at: string;
}

export type LayerCodeCreate = Pick<LayerCodeMapping, "layer_code" | "maker_name">;
export type LayerCodeUpdate = Pick<LayerCodeMapping, "maker_name">;

export const getLayerCodes = async (): Promise<LayerCodeMapping[]> => {
  return await http.get<LayerCodeMapping[]>("rpa/layer-codes");
};

export const createLayerCode = async (data: LayerCodeCreate): Promise<LayerCodeMapping> => {
  return await http.post<LayerCodeMapping>("rpa/layer-codes", data);
};

export const updateLayerCode = async (
  layer_code: string,
  data: LayerCodeUpdate,
): Promise<LayerCodeMapping> => {
  return await http.put<LayerCodeMapping>(`rpa/layer-codes/${layer_code}`, data);
};

export const deleteLayerCode = async (layer_code: string): Promise<void> => {
  await http.delete(`rpa/layer-codes/${layer_code}`);
};
