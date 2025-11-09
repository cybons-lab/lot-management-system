import { fetchApi } from "@/lib/http";
import type { paths, components } from "@/types/api";

// api.d.ts から型を抽出
type ForecastListParams = paths["/api/forecast/list"]["get"]["parameters"]["query"];
type ForecastListResponse =
  paths["/api/forecast/list"]["get"]["responses"][200]["content"]["application/json"];
type ForecastGetParams = paths["/api/forecast"]["get"]["parameters"]["query"];
type ForecastGetResponse =
  paths["/api/forecast"]["get"]["responses"][200]["content"]["application/json"];
type ForecastBulkRequest =
  paths["/api/forecast/bulk"]["post"]["requestBody"]["content"]["application/json"];
type ForecastBulkResponse =
  paths["/api/forecast/bulk"]["post"]["responses"][201]["content"]["application/json"]; // 201に修正

// 互換性のためのエイリアス
export type { ForecastListParams, ForecastListResponse, ForecastBulkRequest, ForecastBulkResponse };
export type ForecastResponse = components["schemas"]["ForecastResponse"];

/**
 * 予測サマリー一覧取得（フロント表示用）
 *
 * 利用可能なパラメータ:
 * - product_code: 製品コードフィルタ
 * - supplier_code: 仕入先コードフィルタ
 */
export const getForecastList = (params?: ForecastListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.supplier_code) searchParams.append("supplier_code", params.supplier_code);

  const queryString = searchParams.toString();
  return fetchApi.get<ForecastListResponse>(
    `/forecast/list${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * 予測データ取得（生データ、ページネーション対応）
 *
 * 利用可能なパラメータ:
 * - skip, limit: ページネーション
 * - product_id, customer_id: ID検索
 * - product_code, customer_code: コード検索
 */
export const getForecast = (params?: ForecastGetParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.product_id) searchParams.append("product_id", params.product_id);
  if (params?.customer_id) searchParams.append("customer_id", params.customer_id);
  if (params?.product_code) searchParams.append("product_code", params.product_code);
  if (params?.customer_code) searchParams.append("customer_code", params.customer_code);

  const queryString = searchParams.toString();
  return fetchApi.get<ForecastGetResponse>(`/forecast${queryString ? "?" + queryString : ""}`);
};

/**
 * 予測一括インポート
 */
export const bulkImportForecast = (data: ForecastBulkRequest) =>
  fetchApi.post<ForecastBulkResponse>("/forecast/bulk", data);

/**
 * 予測データ取得（製品・得意先で検索）
 * @deprecated Use getForecast() with params instead
 */
export const getForecastByCodes = (productCode: string, customerCode: string) => {
  return getForecast({
    product_code: productCode,
    customer_code: customerCode,
  });
};
