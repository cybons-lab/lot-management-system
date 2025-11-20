/**
 * useLotAllocation hook - main orchestrator for lot allocation
 */

export { useLotAllocation } from "./useLotAllocation";
export type { LineStatus, LineStockStatus } from "./useLotAllocation";

// Re-export internal types for advanced usage
export type { AllocationToastState, CandidateLotFetcher } from "./lotAllocationTypes";
