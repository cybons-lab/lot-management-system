/**
 * Bulk Operation Types for Supplier Products
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

export interface SupplierProductBulkRow extends BulkRowBase {
  supplier_code: string;
  supplier_name: string;
  maker_part_no: string;
  display_name: string;
  base_unit: string;
  lead_time_days?: number;
  notes?: string;
}
