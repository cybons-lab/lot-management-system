import Decimal from "decimal.js";

// Set default precision and rounding
// Precision 20 is sufficient for most business applications (PostgreSQL NUMERIC default is often flexible but explicit context helps)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Parsers a value into a Decimal.
 * Returns Decimal(0) if value is null or undefined.
 */
export function parseDecimal(value: string | number | null | undefined): Decimal {
  if (value == null) return new Decimal(0);
  return new Decimal(value);
}

/**
 * Formats a Decimal value to a string with localized formatting.
 * @param value The Decimal value to format
 * @param maximumFractionDigits Maximum number of decimal places (default 3)
 * @param minimumFractionDigits Minimum number of decimal places (default 0)
 */
export function formatDecimal(
  value: Decimal,
  maximumFractionDigits = 3,
  minimumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value.toNumber());
}

/**
 * Calculates available quantity: Current - Allocated - Locked
 * Ensures the result is never negative (returns 0).
 */
export function calculateAvailable(
  current: string | number | null | undefined,
  allocated: string | number | null | undefined,
  locked: string | number | null | undefined,
): Decimal {
  const c = parseDecimal(current);
  const a = parseDecimal(allocated);
  const l = parseDecimal(locked);
  const available = c.minus(a).minus(l);
  return Decimal.max(available, 0);
}
