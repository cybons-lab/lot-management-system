/**
 * Bulk Operation Types for Suppliers
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

/**
 * Supplier用の一括処理行データ
 */
export interface SupplierBulkRow extends BulkRowBase {
  /** 仕入先コード */
  supplier_code: string;
  /** 仕入先名 */
  supplier_name: string;
}

/**
 * Supplier一括リクエスト
 */
export interface SupplierBulkUpsertRequest {
  rows: SupplierBulkRow[];
}
