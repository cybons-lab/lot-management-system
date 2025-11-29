/**
 * Shared Bulk Operation Types
 *
 * Common type definitions for bulk import/export operations across all master data features.
 */

/**
 * Operation type for bulk operations
 * - ADD: Create new record
 * - UPD: Update existing record
 * - DEL: Delete (logical delete or deactivate)
 */
export type BulkOperationType = "ADD" | "UPD" | "DEL";

/**
 * Base type for bulk operation rows
 *
 * All bulk operation row types should extend this interface.
 */
export interface BulkRowBase {
  /** Operation type */
  OPERATION: BulkOperationType;
  /** Row number (for error reporting) */
  _rowNumber?: number;
}

/**
 * Result for a single row in bulk operation
 */
export interface BulkResultRow {
  /** Row number */
  rowNumber: number;
  /** Success status */
  success: boolean;
  /** Target code or ID */
  code?: string;
  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * Summary statistics for bulk operation
 */
export interface BulkOperationSummary {
  /** Total rows processed */
  total: number;
  /** Number of records added */
  added: number;
  /** Number of records updated */
  updated: number;
  /** Number of records deleted */
  deleted: number;
  /** Number of failed operations */
  failed: number;
}

/**
 * Response from bulk upsert operation
 *
 * @template TRow - Type of the row being processed (extends BulkRowBase)
 */
export interface BulkUpsertResponse<TRow extends BulkRowBase = BulkRowBase> {
  /** Overall status */
  status: "success" | "partial" | "failed";
  /** Operation summary statistics */
  summary: BulkOperationSummary;
  /** Per-row results */
  results: Array<BulkResultRow & { row?: TRow }>;
}

/**
 * Request for bulk upsert operation
 *
 * @template TRow - Type of the row being processed (extends BulkRowBase)
 */
export interface BulkUpsertRequest<TRow extends BulkRowBase = BulkRowBase> {
  /** Rows to process */
  rows: TRow[];
}
