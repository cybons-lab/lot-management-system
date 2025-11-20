import type { CandidateLotItem } from "../../api";

/**
 * Stock status information for an order line
 */
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

/**
 * Function type for fetching candidate lots from cache
 */
export interface CandidateLotFetcher {
  (lineId: number): CandidateLotItem[];
}

// Re-export types from allocationActionTypes for backward compatibility
export type {
  LineStatus,
  AllocationToastState,
  AllocationsByLine,
  LineAllocations,
  LineStatusMap,
} from "./allocationActionTypes";
