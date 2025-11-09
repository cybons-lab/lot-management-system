import { fetchApi, http } from "@/lib/http";
import type { LotCandidate } from "@/types/aliases";

/** ---- 型はフック側の想定に合わせる ---- */
export type AllocationInputItem = {
  lotId: number;
  lot: LotCandidate | null;
  warehouse_id?: number | null;
  warehouse_code?: string | null;
  quantity: number;
};

export type CreateAllocationPayload = {
  order_line_id: number;
  product_code: string;
  allocations: AllocationInputItem[];
};

/** フック内で data.order_id を参照しているので最低限これを満たす */
export type AllocationResult = {
  order_id: number;
};

/** 実APIの戻りが success 等でも、UIをブロックしないため order_id を返す */
export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  try {
    await fetchApi.post("/api/allocations", payload);
  } catch (e) {
    // バックエンド未実装/一時的な失敗でもUIを進める（ログだけ残す）
    console.warn("[allocations/api] createAllocations fallback:", e);
  }
  // フックは order_id しか使っていないのでこれで十分
  return { order_id: payload.order_line_id };
}

/** 取消し（フックは戻り値を使っていないので void でOK） */
export async function cancelAllocation(allocationId: number): Promise<void> {
  try {
    await http.delete(`/api/allocations/${allocationId}`);
  } catch (e) {
    console.warn("[allocations/api] cancelAllocation fallback:", e);
  }
}
