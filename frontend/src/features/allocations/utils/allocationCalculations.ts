/**
 * Pure business logic functions for lot allocation calculations
 * These functions have no side effects and are easily testable
 *
 * 【設計意図】なぜPure Functions（純粋関数）なのか:
 *
 * 1. テスタビリティ
 *    理由: 外部状態に依存しない関数は、単体テストが容易
 *    → 入力値を与えると常に同じ出力が得られる
 *    → モックやスタブが不要、テストの信頼性向上
 *    例: calculateAutoAllocation のテストでは、引数を渡すだけで結果を検証可能
 *
 * 2. 予測可能性
 *    理由: 副作用がないため、関数の動作が予測しやすい
 *    → デバッグが容易（入力と出力のみを確認すればよい）
 *    → コードレビュー時の理解が早い
 *
 * 3. 再利用性
 *    理由: React hooks やコンポーネントから独立
 *    → フロントエンドだけでなく、Node.jsサーバー側でも同じロジックを使用可能
 *    → 引当ロジックをマイクロサービス化する際も流用できる
 *
 * 4. パフォーマンス
 *    理由: Reactのメモ化（useMemo）と相性が良い
 *    → 引数が同じなら再計算をスキップできる
 *    → 大量の明細行（100件以上）でも高速に動作
 */

import type { CandidateLotItem } from "../api";
import type { LineAllocations } from "../types";

import type { OrderLine } from "@/shared/types/aliases";

// ===== From allocationFieldHelpers.ts =====

/**
 * Get order quantity from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Order quantity as number
 */
function getLegacyConvertedQuantity(line: OrderLine): number | null {
  if (line.converted_quantity != null && line.converted_quantity !== "") {
    const converted = Number(line.converted_quantity);
    if (Number.isFinite(converted) && converted > 0) {
      return converted;
    }
  }
  return null;
}

interface UnitInfo {
  internalUnit: string | null;
  externalUnit: string | null;
  orderUnit: string | null;
  qtyPerInternalUnit: number;
}

function resolveUnitInfo(line: OrderLine): UnitInfo {
  const internalUnit = line.product_internal_unit ?? line.unit ?? null;
  const externalUnit = line.product_external_unit ?? null;
  const orderUnit = line.unit ?? externalUnit ?? internalUnit ?? null;
  const qtyPerInternalUnit = Number(line.product_qty_per_internal_unit ?? 0);
  return { internalUnit, externalUnit, orderUnit, qtyPerInternalUnit };
}

function calculateUnitConvertedQuantity(line: OrderLine, baseQuantity: number): number {
  const { internalUnit, externalUnit, orderUnit, qtyPerInternalUnit } = resolveUnitInfo(line);

  // Checks for invalid conversion config
  if (!internalUnit || !Number.isFinite(qtyPerInternalUnit) || qtyPerInternalUnit <= 0) {
    return baseQuantity;
  }

  // Already in the internal (inventory) unit
  if (orderUnit === internalUnit) {
    return baseQuantity;
  }

  // Convert external order units to internal units when possible
  if (externalUnit && orderUnit === externalUnit) {
    return baseQuantity / qtyPerInternalUnit;
  }

  return baseQuantity;
}

export function getOrderQuantity(line: OrderLine): number {
  // 1. Try legacy converted quantity first
  const legacyConverted = getLegacyConvertedQuantity(line);
  if (legacyConverted !== null) {
    return legacyConverted;
  }

  // 2. Calculate based on units
  const baseQuantity = Number(line.order_quantity ?? line.quantity ?? 0);
  return calculateUnitConvertedQuantity(line, baseQuantity);
}

/**
 * Get allocated quantity from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Allocated quantity as number
 */
export function getAllocatedQuantity(line: OrderLine): number {
  return Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
}

/**
 * Get free quantity from CandidateLotItem (handles legacy field names)
 * @param lot - Candidate lot item
 * @returns Free quantity as number
 */
export function getFreeQuantity(lot: CandidateLotItem): number {
  return Number(lot.available_quantity ?? 0);
}

/**
 * Get order ID from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Order ID or null
 */
export function getOrderId(line: OrderLine): number | null {
  return line.order_id ?? null;
}

// ===== From allocationCalculations.ts =====

/**
 * Calculate FEFO (First Expiry First Out) auto allocation
 *
 * 【設計意図】FEFO計算ロジックの詳細:
 *
 * 1. クライアント側での有効期限チェック
 *    理由: バックエンドはFEFOソート済みのロット一覧を返す
 *    → しかし、API呼び出しとフロントエンド表示の間にタイムラグがある
 *    → その間に有効期限が切れる可能性（深夜0時をまたぐケース）
 *    → フロントエンドで再度チェックすることで、確実に期限切れ品を除外
 *
 * 2. setHours(0,0,0,0) による日付比較
 *    理由: 時刻を無視して「日付のみ」で比較
 *    例:
 *    - expiry_date: "2024-01-15T23:59:59"（有効期限: 1月15日）
 *    - today: "2024-01-16T00:00:01"（今日: 1月16日）
 *    → 時刻を0時に統一しないと、比較結果が不正確
 *    → setHours(0,0,0,0) で日付のみを比較し、正確に「期限切れ」を判定
 *
 * 3. requiredQty - dbAllocatedQty
 *    理由: DBに既に保存されている引当数量を考慮
 *    ユースケース:
 *    - 受注数量: 100個
 *    - DB既存引当: 30個（別のロットで既に引当済み）
 *    - 残り必要数量: 70個
 *    → 70個分だけ新規引当を計算
 *    → 過剰引当を防ぐ
 *
 * 4. Math.min(remaining, freeQty)
 *    理由: ロットの利用可能数量を超えて引当しない
 *    例:
 *    - 残り必要数量: 50個
 *    - ロットA利用可能数量: 30個
 *    → ロットAから30個を引当
 *    → 残り20個は次のロットから引当
 *
 * 5. candidateLots が FEFO ソート済みであることの前提
 *    理由: バックエンドがFEFO/FIFOポリシーに従ってソート
 *    → フロントエンドは順番通りにループするだけ
 *    → ソートロジックの重複を避ける（バックエンドで一元管理）
 *
 * @param params - Calculation parameters
 * @param params.requiredQty - Total quantity required for the order line
 * @param params.dbAllocatedQty - Quantity already allocated in the database
 * @param params.candidateLots - List of candidate lots (should be pre-sorted by expiry date)
 * @returns Allocation map (lotId -> quantity)
 * @pure No side effects
 */
export function calculateAutoAllocation(params: {
  requiredQty: number;
  dbAllocatedQty: number;
  candidateLots: CandidateLotItem[];
}): LineAllocations {
  const { requiredQty, dbAllocatedQty, candidateLots } = params;

  // Calculate remaining quantity to allocate
  // 【重要】DB既存引当を差し引いて、新規引当が必要な数量を計算
  let remaining = requiredQty - dbAllocatedQty;

  const newLineAllocations: LineAllocations = {};

  // Iterate through candidate lots (assumed to be sorted by FEFO)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻を0時に統一し、日付のみで比較

  for (const lot of candidateLots) {
    if (remaining <= 0) break;

    // Skip expired lots
    // 【重要】クライアント側でも有効期限を再チェック（API呼び出し後の時刻変化に対応）
    if (lot.expiry_date) {
      const expiry = new Date(lot.expiry_date);
      if (expiry < today) continue;
    }

    const lotId = lot.lot_id;
    const freeQty = getFreeQuantity(lot);

    // Allocate as much as possible from this lot
    // 【設計】ロットの利用可能数量を超えて引当しない（Math.min）
    const allocateQty = Math.min(remaining, freeQty);

    if (allocateQty > 0) {
      newLineAllocations[lotId] = allocateQty;
      remaining -= allocateQty;
    }
  }

  return newLineAllocations;
}

/**
 * Clamp allocation quantity within valid range
 * @param params - Clamping parameters
 * @param params.value - Input value to clamp
 * @param params.maxAllowed - Maximum allowed value
 * @returns Clamped value (0 <= result <= maxAllowed)
 * @pure No side effects
 */
export function clampAllocationQuantity(params: { value: number; maxAllowed: number }): number {
  const { value, maxAllowed } = params;

  // Ensure value is finite
  const safeValue = Number.isFinite(value) ? value : 0;

  // Clamp between 0 and maxAllowed
  return Math.max(0, Math.min(maxAllowed, safeValue));
}

/**
 * Check if total allocated quantity exceeds required quantity
 * @param params - Check parameters
 * @param params.requiredQty - Total quantity required
 * @param params.dbAllocated - Quantity already allocated in database
 * @param params.uiAllocated - Quantity allocated in UI (pending save)
 * @returns True if over-allocated, false otherwise
 * @pure No side effects
 */
export function checkOverAllocation(params: {
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
}): boolean {
  const { requiredQty, dbAllocated, uiAllocated } = params;
  return dbAllocated + uiAllocated > requiredQty;
}

/**
 * Calculate total UI allocated quantity for a line
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Total allocated quantity
 * @pure No side effects
 */
export function calculateTotalUiAllocated(allocations: LineAllocations): number {
  return Object.values(allocations).reduce((sum, quantity) => sum + quantity, 0);
}

/**
 * Remove zero-quantity allocations from allocation map
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Cleaned allocation map with zero quantities removed
 * @pure No side effects
 */
export function removeZeroAllocations(allocations: LineAllocations): LineAllocations {
  const cleaned: LineAllocations = {};

  for (const [lotIdStr, quantity] of Object.entries(allocations)) {
    if (quantity > 0) {
      cleaned[Number(lotIdStr)] = quantity;
    }
  }

  return cleaned;
}

/**
 * Convert allocation map to API payload format
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Array of allocation objects suitable for API
 * @pure No side effects
 */
export function convertAllocationsToPayload(
  allocations: LineAllocations,
): Array<{ lot_id: number; quantity: number }> {
  return Object.entries(allocations)
    .map(([lotIdStr, qty]) => ({
      lot_id: Number(lotIdStr),
      quantity: Number(qty),
    }))
    .filter((item) => item.quantity > 0);
}
