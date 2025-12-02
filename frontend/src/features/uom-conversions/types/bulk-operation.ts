/**
 * Bulk Operation Types for UOM Conversions
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

export interface UomConversionBulkRow {
  product_code: string;
  external_unit: string;
  factor: number;
  _rowNumber?: number;
}
