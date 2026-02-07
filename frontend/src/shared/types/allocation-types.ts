/**
 * Allocation-related type definitions
 *
 * This file contains allocation types that are shared across multiple modules
 * to avoid circular dependencies.
 */

/**
 * 引当済みロット情報
 *
 * 受注明細に対して引き当てられたロットの詳細情報を表現します。
 */
export interface AllocatedLot {
  /** ロットID */
  lot_id: number;
  /** 引当数量（DDL v2.2: DECIMAL(15,3)） */
  allocated_quantity: number | string | null;
  /** 引当数量（非推奨：allocated_quantityを使用してください） */
  allocated_qty?: number | null;
  /** 引当ID（UI参照用） */
  allocation_id?: number;
  /** 納品場所コード */
  delivery_place_code: string | null;
  /** 納品場所名 */
  delivery_place_name: string | null;
  /** 引当タイプ */
  allocation_type?: string;
  /** ロット番号 */
  lot_number?: string | null;
  /** ステータス */
  status?: string;
}
