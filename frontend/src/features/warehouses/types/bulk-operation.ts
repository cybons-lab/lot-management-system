/**
 * Bulk Operation Types for Warehouses
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/features/customers/types/bulk-operation";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

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
