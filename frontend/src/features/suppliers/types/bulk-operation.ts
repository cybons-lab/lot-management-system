/**
 * Bulk Operation Types for Suppliers
 */

// Import base types from shared location
import type {
  BulkOperationType,
  BulkRowBase,
  BulkUpsertResponse,
  BulkUpsertRequest,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkUpsertResponse };

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
 * TODO: backend: bulk-upsert API未実装
 */
export interface SupplierBulkUpsertRequest {
  rows: SupplierBulkRow[];
}
