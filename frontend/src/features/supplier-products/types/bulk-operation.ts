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
  product_code: string;
  product_name: string;
  order_unit?: string;
  order_lot_size?: number;
}
