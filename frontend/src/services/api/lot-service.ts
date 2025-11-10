/**
 * Lot Service
 * ロット関連のAPI通信関数
 */

import { http } from "@/services/http";
import type { LotResponse } from "@/shared/types/aliases";
import type { LotCreateInput, LotUpdateInput, LotSearchParams } from "@/utils/validators";

const BASE_PATH = "/lots";

/**
 * ロット一覧を取得
 */
export async function listLots(params?: LotSearchParams): Promise<LotResponse[]> {
  const response = await http.get<LotResponse[]>(BASE_PATH, { params });
  return response.data;
}

/**
 * ロット詳細を取得
 */
export async function getLotById(id: number): Promise<LotResponse> {
  const response = await http.get<LotResponse>(`${BASE_PATH}/${id}`);
  return response.data;
}

/**
 * ロットを作成
 */
export async function createLot(data: LotCreateInput): Promise<LotResponse> {
  const response = await http.post<LotResponse>(BASE_PATH, data);
  return response.data;
}

/**
 * ロットを更新
 */
export async function updateLot(id: number, data: LotUpdateInput): Promise<LotResponse> {
  const response = await http.put<LotResponse>(`${BASE_PATH}/${id}`, data);
  return response.data;
}

/**
 * ロットを削除
 */
export async function deleteLot(id: number): Promise<void> {
  await http.delete(`${BASE_PATH}/${id}`);
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
