// frontend/src/features/admin/api/admin-seeds.ts
import { http } from "@/shared/api/http-client";
export interface SeedRequest {
  seed?: number;
  dry_run?: boolean;
  customers?: number;
  products?: number;
  warehouses?: number;
  lots?: number;
  orders?: number;
}
export interface SeedResponse {
  dry_run: boolean;
  seed: number;
  summary: {
    customers: number;
    products: number;
    warehouses: number;
    lots: number;
    orders: number;
    order_lines: number;
    allocations: number;
  };
}

export async function postSeeds(body: SeedRequest): Promise<SeedResponse> {
  // http に baseURL が設定されている前提（/api など）
  return http.post<SeedResponse>("admin/seeds", body);
}
