/**
 * Bulk Operation Types for Warehouses
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
 * Warehouse用の一括処理行データ
 */
export interface WarehouseBulkRow extends BulkRowBase {
  /** 倉庫コード */
  warehouse_code: string;
  /** 倉庫名 */
  warehouse_name: string;
  /** 倉庫タイプ (internal/external/supplier) */
  warehouse_type: string;
}

/**
 * Warehouse一括リクエスト
 * TODO: backend: bulk-upsert API未実装
 */
export interface WarehouseBulkUpsertRequest {
  rows: WarehouseBulkRow[];
}
