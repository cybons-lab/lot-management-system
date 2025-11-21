/**
 * Bulk Operation Types for Products
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/features/customers/types/bulk-operation";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

/**
 * Product用の一括処理行データ
 */
export interface ProductBulkRow extends BulkRowBase {
  /** メーカー品番 */
  maker_part_code: string;
  /** 商品名 */
  product_name: string;
  /** 社内在庫単位 */
  base_unit: string;
  /** 消費期限日数 */
  consumption_limit_days?: number | null;
}

/**
 * Product一括リクエスト
 * TODO: backend: bulk-upsert API未実装
 */
export interface ProductBulkUpsertRequest {
  rows: ProductBulkRow[];
}
