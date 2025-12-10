import type { components } from "@/types/api";

export type Schema = components["schemas"];

// Allocations
export type CandidateLotItem = Schema["CandidateLotItem"];
export type CandidateLotsResponse = Schema["ListResponse_CandidateLotItem_"];
// ManualAllocationRequest/Response removed - using v2 types directly in api.ts
export type FefoPreviewRequest = Schema["FefoPreviewRequest"];
export type FefoPreviewResponse = Schema["FefoPreviewResponse"];
export type FefoLineAllocation = Schema["FefoLineAllocation"];
export type FefoLotAllocation = Schema["FefoLotAllocation"];
export type AllocationCommitRequest = Schema["AllocationCommitRequest"];
export type AllocationCommitResponse = Schema["AllocationCommitResponse"];
export type ManualAllocationSavePayload = Schema["ManualAllocationSavePayload"];
// export type ManualAllocationSaveResponse = Schema["ManualAllocationSaveResponse"];

// Forecasts
export type Forecast = Schema["ForecastResponse"];
export type ForecastGroupKey = Schema["ForecastGroupKey"];
export type ForecastGroup = Schema["ForecastGroupResponse"];
export type ForecastListResponse = Schema["ListResponse_ForecastGroupResponse_"];
export type ForecastHistory = Schema["ForecastHistoryResponse"];
export type CreateForecastRequest = Schema["ForecastCreate"];
export type UpdateForecastRequest = Schema["ForecastUpdate"];
export type BulkImportItem = Schema["ForecastBulkImportItem"];
export type BulkImportForecastRequest = Schema["ForecastBulkImportRequest"];
export type BulkImportForecastSummary = Schema["ForecastBulkImportSummary"];
// export type ForecastLine = Schema["ForecastLine"]; // Not found in recent search, maybe removed or renamed

// Orders
export type OrderResponse = Schema["OrderWithLinesResponse"];
export type OrderLineResponse = Schema["OrderLineResponse"];
// export type WarehouseListResponse = Schema["WarehouseListResponse"]; // Not in current OpenAPI schema

// Lots
// export type Lot = Schema["Lot"]; // Likely LotRead
