/**
 * Bulk Operation Types for Products
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

/**
 * Product用の一括処理行データ
 */
export interface ProductBulkRow extends BulkRowBase {
  /** 製品コード */
  product_code: string;
  /** 商品名 */
  product_name: string;
  /** 社内単位 */
  internal_unit: string;
  /** 外部単位 */
  external_unit: string;
  /** 内部単位あたりの数量 */
  qty_per_internal_unit: number;
  /** 得意先品番 */
  customer_part_no?: string | null;
  /** メーカー品番 */
  maker_item_code?: string | null;
  /** 有効フラグ */
  is_active: boolean;
}

/**
 * Product一括リクエスト
 */
export interface ProductBulkUpsertRequest {
  rows: ProductBulkRow[];
}
