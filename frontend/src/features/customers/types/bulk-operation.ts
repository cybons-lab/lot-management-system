/**
 * Bulk Operation Types
 * 一括インポート/エクスポート用の共通型定義
 *
 * このファイルは他のマスタ（Warehouses, Products, Suppliers等）でも
 * 流用できる共通パターンとして設計されています。
 */

import type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
} from "@/shared/types/bulk-operations";

export type { BulkOperationType, BulkRowBase, BulkResultRow, BulkUpsertResponse };

/**
 * Customer用の一括処理行データ
 */
export interface CustomerBulkRow extends BulkRowBase {
  /** 得意先コード */
  customer_code: string;
  /** 得意先名 */
  customer_name: string;
  /** 住所 */
  address?: string;
  /** 担当者名 */
  contact_name?: string;
  /** 電話番号 */
  phone?: string;
  /** メールアドレス */
  email?: string;
}

/**
 * Customer一括リクエスト
 * TODO: backend: bulk-upsert API未実装
 */
export interface CustomerBulkUpsertRequest {
  rows: CustomerBulkRow[];
}
