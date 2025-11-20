import type { CandidateLotItem } from "../../api";

export interface LineStockStatus {
  hasShortage: boolean;
  totalAvailable: number;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  totalAllocated: number;
  remainingQty: number;
  progress: number;
}

export type LineStatus = "clean" | "draft" | "committed";

export type AllocationToastState = { message: string; variant: "success" | "error" } | null;

export interface CandidateLotFetcher {
  (lineId: number): CandidateLotItem[];
}
