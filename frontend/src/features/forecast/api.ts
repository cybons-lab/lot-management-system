// Auto-generated from api-client.ts split
import { fetchApi } from "@/lib/http";
import type {
  ForecastListParams,
  ForecastListResponse,
  ForecastBulkRequest,
  ForecastBulkResponse,
} from "@/types";

export const getForecastList = (params: ForecastListParams) => {
  const searchParams = new URLSearchParams();
  if (params.product_code)
    searchParams.append("product_code", params.product_code);
  if (params.supplier_code)
    searchParams.append("supplier_code", params.supplier_code);

  const queryString = searchParams.toString();
  return fetchApi<ForecastListResponse>(
    `/forecast/list${queryString ? "?" + queryString : ""}`,
    { method: "GET" }
  );
};

export const bulkImportForecast = (data: ForecastBulkRequest) =>
  fetchApi<ForecastBulkResponse>("/forecast/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
