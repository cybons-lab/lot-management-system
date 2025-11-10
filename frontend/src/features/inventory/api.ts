import { fetchApi } from "@/shared/libs/http";
import type { paths } from "@/types/api";

// api.d.ts から型を抽出
type LotsGetParams = paths["/api/lots"]["get"]["parameters"]["query"];
type LotsGetResponse = paths["/api/lots"]["get"]["responses"][200]["content"]["application/json"];
type LotGetResponse =
  paths["/api/lots/{lot_id}"]["get"]["responses"][200]["content"]["application/json"];
type LotCreateRequest = paths["/api/lots"]["post"]["requestBody"]["content"]["application/json"];
type LotCreateResponse =
  paths["/api/lots"]["post"]["responses"][201]["content"]["application/json"];

/**
 * ロット一覧取得
 *
 * @param params - クエリパラメータ（製品、倉庫、期限などでフィルタ可能）
 * @returns ロット一覧
 */
export const getLots = (params?: LotsGetParams) => {
  const searchParams = new URLSearchParams();

  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.supplier_code) searchParams.append("supplier_code", params.supplier_code);
  if (params?.warehouse_code) searchParams.append("warehouse_code", params.warehouse_code);
  if (params?.expiry_from) searchParams.append("expiry_from", params.expiry_from);
  if (params?.expiry_to) searchParams.append("expiry_to", params.expiry_to);
  if (params?.with_stock !== undefined)
    searchParams.append("with_stock", params.with_stock.toString());

  const queryString = searchParams.toString();
  return fetchApi.get<LotsGetResponse>(`/lots${queryString ? "?" + queryString : ""}`);
};

/**
 * ロット詳細取得
 */
export const getLot = (id: number) => fetchApi.get<LotGetResponse>(`/lots/${id}`);

/**
 * ロット新規作成
 */
export const createLot = (data: LotCreateRequest) =>
  fetchApi.post<LotCreateResponse>("/lots", data);
