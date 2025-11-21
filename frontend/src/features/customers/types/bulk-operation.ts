/**
 * Bulk Operation Types
 * 一括インポート/エクスポート用の共通型定義
 *
 * このファイルは他のマスタ（Warehouses, Products, Suppliers等）でも
 * 流用できる共通パターンとして設計されています。
 */

/**
 * OPERATION列の値
 * - ADD: 新規追加
 * - UPD: 既存レコードの更新
 * - DEL: 削除（論理削除 or 無効化）
 */
export type BulkOperationType = "ADD" | "UPD" | "DEL";

/**
 * 一括処理の行データ基底型
 */
export interface BulkRowBase {
  /** 操作種別 */
  OPERATION: BulkOperationType;
  /** 行番号（エラー表示用） */
  _rowNumber?: number;
}

/**
 * 一括処理結果の行レスポンス
 */
export interface BulkResultRow {
  /** 行番号 */
  rowNumber: number;
  /** 成否 */
  success: boolean;
  /** 対象コード or ID */
  code?: string;
  /** エラーメッセージ */
  errorMessage?: string;
}

/**
 * 一括処理レスポンス
 * TODO: backend: バックエンドのレスポンス形式に合わせて調整が必要
 */
export interface BulkUpsertResponse {
  /** 全体ステータス */
  status: "success" | "partial" | "failed";
  /** 処理件数サマリ */
  summary: {
    total: number;
    added: number;
    updated: number;
    deleted: number;
    failed: number;
  };
  /** 行ごとの結果 */
  results: BulkResultRow[];
}

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
