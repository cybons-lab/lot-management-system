/**
 * Customer Bulk Operation Types
 *
 * Customer-specific types for bulk import/export.
 * Base types are imported from shared/types/bulk-operations.
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkUpsertResponse,
  BulkUpsertRequest,
} from "@/shared/types/bulk-operations";

// Re-export base types for backward compatibility
export type { BulkOperationType, BulkRowBase, BulkUpsertResponse }

/**
 * Customer用の一括処理行データ
 */
export interface CustomerBulkRow extends BulkRowBase {
  /** 得意先コード */
  customer_code: string;
  /** 得意先名 */
  customer_name: string;
}

/**
 * Customer一括リクエスト
 * TODO: backend: bulk-upsert API未実装
 */
export interface CustomerBulkUpsertRequest {
  rows: CustomerBulkRow[];
}
