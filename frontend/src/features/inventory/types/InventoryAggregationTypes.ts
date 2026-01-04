/**
 * サプライヤー別在庫集計データ
 *
 * サプライヤーごとに在庫を集計した結果を表現します。
 */
export interface InventoryBySupplierResponse {
  /** サプライヤーID */
  supplier_id: number;
  /** サプライヤー名 */
  supplier_name: string;
  /** サプライヤーコード */
  supplier_code: string;
  /** 合計在庫数量（数値または文字列形式） */
  total_quantity: number | string;
  /** ロット数 */
  lot_count: number;
  /** 製品種類数 */
  product_count: number;
  /** 主要サプライヤーフラグ */
  is_primary_supplier?: boolean;
}

/**
 * 倉庫別在庫集計データ
 *
 * 倉庫ごとに在庫を集計した結果を表現します。
 */
export interface InventoryByWarehouseResponse {
  /** 倉庫ID */
  warehouse_id: number;
  /** 倉庫名 */
  warehouse_name: string;
  /** 倉庫コード */
  warehouse_code: string;
  /** 合計在庫数量（数値または文字列形式） */
  total_quantity: number | string;
  /** ロット数 */
  lot_count: number;
  /** 製品種類数 */
  product_count: number;
}

/**
 * 製品別在庫集計データ
 *
 * 製品ごとに在庫を集計した結果を表現します。
 */
export interface InventoryByProductResponse {
  /** 製品ID */
  product_id: number;
  /** 製品名 */
  product_name: string;
  /** 製品コード */
  product_code: string;
  /** 合計在庫数量（数値または文字列形式） */
  total_quantity: number | string;
  /** 引当済み数量（数値または文字列形式） */
  allocated_quantity: number | string;
  /** 引当可能数量（数値または文字列形式） */
  available_quantity: number | string;
  /** ロット数 */
  lot_count: number;
  /** 保管倉庫数 */
  warehouse_count: number;
}
