import { fetchApi } from "@/lib/http";

export interface AllocationInputItem {
  warehouse_id?: number | null;
  warehouse_code?: string | null;
  quantity: number;
}

export interface CreateAllocationPayload {
  order_line_id: number;
  product_code: string;
  allocations: AllocationInputItem[];
}

export interface CreateAllocationResponse {
  success: boolean;
  message?: string;
}

export const createAllocations = (payload: CreateAllocationPayload) =>
  fetchApi<CreateAllocationResponse>("/api/allocations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
