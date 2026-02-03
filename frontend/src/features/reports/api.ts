import { http } from "@/shared/api/http-client";

export interface MonthlyDestinationReportItem {
  delivery_place_id: number;
  destination_name: string;
  customer_name: string;
  total_quantity: number | string;
  lot_count: number;
}

export async function fetchMonthlyByDestination(params: {
  product_id: number;
  warehouse_id: number;
  year: number;
  month: number;
}): Promise<MonthlyDestinationReportItem[]> {
  return http.get<MonthlyDestinationReportItem[]>("reports/monthly-by-destination", {
    searchParams: {
      product_id: params.product_id,
      warehouse_id: params.warehouse_id,
      year: params.year,
      month: params.month,
    },
  });
}
