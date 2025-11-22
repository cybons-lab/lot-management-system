/**
 * Format quantity based on unit type
 * 
 * Business rules:
 * - Countable units (PCS, BOX, CAN, EA): Integer only (no decimals)
 * - Measurable units (L, ML, KG, G): Decimal allowed (max 2 decimals)
 */

const COUNTABLE_UNITS = new Set(['PCS', 'BOX', 'CAN', 'EA', 'CARTON', 'PACK']);
const MEASURABLE_UNITS = new Set(['L', 'ML', 'KG', 'G', 'TON']);

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
    includeUnit: boolean = false
): string {
    const numValue = Number(value ?? 0);

    if (isNaN(numValue)) {
        return includeUnit ? `0 ${unit}` : '0';
    }

    let formatted: string;

    if (isCountableUnit(unit)) {
        // Countable units: no decimals
        formatted = Math.round(numValue).toLocaleString('ja-JP', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    } else if (isMeasurableUnit(unit)) {
        // Measurable units: max 2 decimals
        formatted = numValue.toLocaleString('ja-JP', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    } else {
        // Unknown unit: default to 2 decimals
        formatted = numValue.toLocaleString('ja-JP', {
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
    convertedUnit?: string
): string {
    const primary = formatQuantity(primaryValue, primaryUnit, true);

    if (!convertedValue || !convertedUnit || primaryUnit === convertedUnit) {
        return primary;
    }

    const converted = formatQuantity(convertedValue, convertedUnit, true);
    return `${primary} (= ${converted})`;
}
