/**
 * Type definitions for lot allocation feature
 */

import type { CandidateLotItem } from "../api";

import type { OrderLine as SharedOrderLine } from "@/shared/types/aliases";

export type OrderLine = SharedOrderLine;

/**
 * 優先度レベル
 *
 * 受注カードの優先度を表現します。
 * - urgent: 緊急（納期遅延など）
 * - warning: 警告（在庫不足など）
 * - attention: 注意（引当未完了）
 * - allocated: 引当済み
 * - inactive: 非アクティブ
 */
export type PriorityLevel = "urgent" | "warning" | "attention" | "allocated" | "inactive";

/**
 * 受注情報
 *
 * システム内の受注を表現します。
 */
export interface Order {
  /** 受注ID */
  id: number;
  /** 受注コード（customer_order_noまたはIDから生成される表示用識別子） */
  order_code: string;
  /** 得意先受注番号 */
  customer_order_no?: string | null;
  /** 顧客ID（DDL v2.2） */
  customer_id: number;
  /** 納品場所ID（DDL v2.2） */
  delivery_place_id: number;
  /** 受注日 */
  order_date: string;
  /** ステータス */
  status: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
  // 後方互換性のためのレガシーフィールド
  /** 受注番号（レガシー） */
  order_no?: string;
  /** 顧客コード（レガシー） */
  customer_code?: string | null;
  /** 顧客名（レガシー） */
  customer_name?: string;
  /** 納期（レガシー） */
  due_date?: string | null;
  /** 納品場所コード（レガシー） */
  delivery_place_code?: string | null;
  /** 納品場所名（レガシー） */
  delivery_place_name?: string | null;
  /** 納品場所（レガシー） */
  delivery_place?: string | null;
  /** 合計数量（レガシー） */
  total_quantity?: number | null;
  /** 出荷先（レガシー） */
  ship_to?: string;
  /** 受注明細 */
  lines?: OrderLine[];
}

/**
 * 受注カード表示用データ
 *
 * UI上の受注カードに表示するための拡張された受注情報です。
 */
export interface OrderCardData extends Order {
  /** 優先度レベル */
  priority: PriorityLevel;
  /** 未引当数量 */
  unallocatedQty: number;
  /** 納期までの日数 */
  daysTodue: number | null;
  /** 必須フィールドの欠損有無 */
  hasMissingFields: boolean;
  /** 合計数量 */
  totalQuantity: number;
  /** 主要納品場所 */
  primaryDeliveryPlace?: string | null;
}

/**
 * 倉庫別在庫サマリー情報
 *
 * 倉庫ごとの在庫集計情報を表現します。
 */
export type WarehouseSummary = {
  /** 一意キー */
  key: string;
  /** 倉庫ID */
  warehouseId?: number;
  /** 倉庫コード */
  warehouseCode?: string | null;
  /** 倉庫名 */
  warehouseName?: string | null;
  /** 合計在庫数 */
  totalStock: number;
};

// ===== Consolidated Types from useLotAllocation =====

/**
 * Allocations organized by line ID
 * Record<lineId, Record<lotId, quantity>>
 */
export type AllocationsByLine = Record<number, LineAllocations>;

/**
 * Allocations for a single line
 * Record<lotId, quantity>
 */
export type LineAllocations = Record<number, number>;

/**
 * Line status map
 * Record<lineId, LineStatus>
 */
export type LineStatusMap = Record<number, LineStatus>;

/**
 * Status of an allocation line
 * - clean: No pending changes
 * - draft: Has unsaved changes
 * - committed: Successfully saved
 */
export type LineStatus = "clean" | "draft" | "committed";

/**
 * Toast state for allocation operations
 */
export type AllocationToastState = { message: string; variant: "success" | "error" } | null;

/**
 * Stock status information for an order line
 */
export interface LineStockStatus {
  hasShortage: boolean;
  totalAvailable: number;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  totalAllocated: number;
  remainingQty: number;
  progress: number;
}

/**
 * Function type for fetching candidate lots from cache
 */
export interface CandidateLotFetcher {
  (lineId: number, productId: number): CandidateLotItem[];
}
