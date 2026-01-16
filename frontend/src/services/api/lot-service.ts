/**
 * Lot Service
 * ロット関連のAPI通信関数
 */

import { http } from "@/shared/api/http-client";
import type { LotResponse } from "@/shared/types/aliases";
import type { LotCreateInput, LotUpdateInput, LotSearchParams } from "@/utils/validators";

const BASE_PATH = "/lots";

/**
 * ロット一覧を取得
 */
export async function listLots(params?: LotSearchParams): Promise<LotResponse[]> {
  return http.get<LotResponse[]>(BASE_PATH, {
    searchParams: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * ロット詳細を取得
 */
export async function getLotById(id: number): Promise<LotResponse> {
  return http.get<LotResponse>(`${BASE_PATH}/${id}`);
}

/**
 * ロットを作成
 */
export async function createLot(data: LotCreateInput): Promise<LotResponse> {
  return http.post<LotResponse>(BASE_PATH, data);
}

/**
 * ロットを更新
 */
export async function updateLot(id: number, data: LotUpdateInput): Promise<LotResponse> {
  return http.put<LotResponse>(`${BASE_PATH}/${id}`, data);
}

/**
 * ロットを削除
 */
export async function deleteLot(id: number): Promise<void> {
  await http.deleteVoid(`${BASE_PATH}/${id}`);
}

/**
 * 在庫のあるロットのみを取得
 */
export async function listLotsWithStock(
  params?: Omit<LotSearchParams, "has_stock">,
): Promise<LotResponse[]> {
  return listLots({ ...params, has_stock: true });
}

/**
 * 特定製品のロットを取得
 */
export async function listLotsByProduct(productCode: string): Promise<LotResponse[]> {
  return listLots({ product_code: productCode });
}

/**
 * 特定仕入先のロットを取得
 */
export async function listLotsBySupplier(supplierCode: string): Promise<LotResponse[]> {
  return listLots({ supplier_code: supplierCode });
}

/**
 * ロットをロック
 */
export async function lockLot(id: number, reason: string, quantity?: number): Promise<LotResponse> {
  return http.post<LotResponse>(`${BASE_PATH}/${id}/lock`, { reason, quantity });
}

/**
 * ロットのロックを解除
 */
export async function unlockLot(id: number, quantity?: number): Promise<LotResponse> {
  return http.post<LotResponse>(`${BASE_PATH}/${id}/unlock`, { quantity });
}

export type StockMovementType = "inbound" | "allocation" | "shipment" | "adjustment" | "return";

export interface StockMovementCreate {
  lot_id: number;
  transaction_type: StockMovementType;
  quantity_change: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  transaction_date?: string | null;
}

export interface StockMovementResponse {
  history_id: number;
  lot_id: number;
  transaction_type: StockMovementType;
  quantity_change: number;
  quantity_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  transaction_date: string;
}

export async function createStockMovement(
  data: StockMovementCreate,
): Promise<StockMovementResponse> {
  return http.post<StockMovementResponse>(`${BASE_PATH}/movements`, data);
}
