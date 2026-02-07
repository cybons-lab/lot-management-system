/**
 * Format quantity based on unit type
 *
 * Business rules:
 * - Countable units (PCS, BOX, CAN, EA): Integer only (no decimals)
 * - Measurable units (L, ML, KG, G): Decimal allowed (max 2 decimals)
 *
 * 【設計意図】なぜ単位によってフォーマットを変えるのか:
 *
 * 1. ビジネスルールへの準拠
 *    理由: 自動車部品業界では、単位の種類によって扱い方が異なる
 *    - 個数単位（PCS、BOX等）: 「1.5個」という概念はない → 整数のみ
 *    - 重量・容量単位（KG、L等）: 「10.5kg」のように小数点以下が存在 → 小数許容
 *
 * 2. ユーザビリティの向上
 *    理由: 単位に応じた適切な表示で、ユーザーの混乱を防ぐ
 *    例: 「10.0 PCS」ではなく「10 PCS」と表示
 *    → 不要な小数点を省くことで、画面が見やすくなる
 *
 * 3. データ入力時のバリデーション
 *    用途: このフォーマットルールは、入力フォームのバリデーションでも使用
 *    → 個数単位で小数入力を防ぐ
 *    → 重量単位では小数2桁まで許容
 *
 * 4. 小数2桁までの制限
 *    理由: 在庫管理で必要な精度は小数2桁で十分
 *    例: 10.123kg → 10.12kg に丸める
 *    → システムのデータ精度と表示精度の統一
 */

const COUNTABLE_UNITS = new Set(["PCS", "BOX", "CAN", "EA", "CARTON", "PACK"]);
const MEASURABLE_UNITS = new Set(["L", "ML", "KG", "G", "TON"]);

/**
 * Check if a unit is countable (must be integer)
 */
export function isCountableUnit(unit: string): boolean {
  return COUNTABLE_UNITS.has(unit.toUpperCase());
}

/**
 * Check if a unit is measurable (decimal allowed)
 */
export function isMeasurableUnit(unit: string): boolean {
  return MEASURABLE_UNITS.has(unit.toUpperCase());
}

/**
 * Format quantity according to unit type
 *
 * @param value - Quantity value
 * @param unit - Unit string (e.g., "PCS", "KG")
 * @param includeUnit - Whether to append unit to output
 * @returns Formatted quantity string
 *
 * @example
 * formatQuantity(10.5, "PCS") => "11" (rounded to nearest integer)
 * formatQuantity(10.5, "KG") => "10.50"
 * formatQuantity(10.5, "KG", true) => "10.50 KG"
 */
export function formatQuantity(
  value: number | string | null | undefined,
  unit: string,
  includeUnit = false,
): string {
  const numValue = Number(value ?? 0);

  if (isNaN(numValue)) {
    return includeUnit ? `0 ${unit}` : "0";
  }

  let formatted: string;

  if (isCountableUnit(unit)) {
    // Countable units: no decimals
    // 【設計】Math.round()で四捨五入し、整数のみ表示
    formatted = Math.round(numValue).toLocaleString("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } else if (isMeasurableUnit(unit)) {
    // Measurable units: max 2 decimals
    formatted = numValue.toLocaleString("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } else {
    // Unknown unit: default to 2 decimals
    // 【設計】未知の単位は安全側に倒して小数2桁まで許容（計量単位と仮定）
    formatted = numValue.toLocaleString("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  return includeUnit ? `${formatted} ${unit}` : formatted;
}

/**
 * FormatQuantity with separate display (for unit conversion display)
 *
 * @example
 * formatQuantityWithConversion(10, "KG", 2, "CAN")
 * => "10.00 KG (= 2 CAN)"
 */
export function formatQuantityWithConversion(
  primaryValue: number | string | null | undefined,
  primaryUnit: string,
  convertedValue?: number | string | null,
  convertedUnit?: string,
): string {
  const primary = formatQuantity(primaryValue, primaryUnit, true);

  if (!convertedValue || !convertedUnit || primaryUnit === convertedUnit) {
    return primary;
  }

  const converted = formatQuantity(convertedValue, convertedUnit, true);
  return `${primary} (= ${converted})`;
}
