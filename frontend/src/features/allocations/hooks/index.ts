/**
 * Export all allocation hooks (v2.2 - Phase E updated)
 */

// Main orchestrator hook
export { useLotAllocation } from "./useLotAllocation";
export type { LineStatus, LineStockStatus, AllocationToastState, CandidateLotFetcher } from "./useLotAllocation";

// Legacy hooks
export { useOrderSelection } from "./useOrderSelection";
export { useAutoSelection } from "./useAutoSelection";
export { useAllocationMutation } from "./useAllocationMutation";
export { useSnackbar } from "./useSnackbar";
export { useOrderCards } from "./useOrderCards";

// New hooks (v2.2.1)
export { useAllocationCandidates, allocationCandidatesKeys } from "./useAllocationCandidates";
export {
  useCreateManualAllocationSuggestion,
  useCreateFefoAllocationSuggestion,
  useCommitAllocation,
  useCancelAllocation,
} from "./useAllocationSuggestions";
