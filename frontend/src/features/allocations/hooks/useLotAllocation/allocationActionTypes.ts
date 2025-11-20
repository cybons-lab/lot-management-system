/**
 * Type definitions for lot allocation actions
 */

/**
 * Allocations organized by line ID
 * Record<lineId, Record<lotId, quantity>>
 */
export type AllocationsByLine = Record<number, LineAllocations>;

/**
 * Allocations for a single line
 * Record<lotId, quantity>
 */
export type LineAllocations = Record<number, number>;

/**
 * Line status map
 * Record<lineId, LineStatus>
 */
export type LineStatusMap = Record<number, LineStatus>;

/**
 * Status of an allocation line
 * - clean: No pending changes
 * - draft: Has unsaved changes
 * - committed: Successfully saved
 */
export type LineStatus = "clean" | "draft" | "committed";

/**
 * Toast state for allocation operations
 */
export type AllocationToastState = { message: string; variant: "success" | "error" } | null;
