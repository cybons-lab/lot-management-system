/**
 * Product CSV Utilities
 * CSV parsing and template generation for product bulk import
 */

import type { ProductBulkRow } from "../types/bulk-operation";

/**
 * Parse product CSV file content
 *
 * Expected CSV format:
 * OPERATION,product_code,product_name,internal_unit,external_unit,qty_per_internal_unit,customer_part_no,maker_item_code,is_active
 *
 * @param csvText - CSV file content as string
 * @returns Parsed rows and errors
 */
// Helper to parse individual row
function parseProductRow(
  cols: string[],
  rowIndex: number,
): { row?: ProductBulkRow; error?: string } {
  if (cols.length < 5) {
    return { error: `行${rowIndex}: 必須列が不足しています` };
  }

  const [
    operation,
    product_code,
    product_name,
    internal_unit,
    external_unit,
    qty_per_internal_unit_str,
    customer_part_no,
    maker_item_code,
    is_active_str,
  ] = cols;

  // Validate operation
  if (!["ADD", "UPD", "DEL"].includes(operation)) {
    return { error: `行${rowIndex}: 無効なOPERATION値 (${operation})` };
  }

  const qty_per_internal_unit = parseFloat(qty_per_internal_unit_str || "1.0");
  if (isNaN(qty_per_internal_unit) || qty_per_internal_unit <= 0) {
    return { error: `行${rowIndex}: qty_per_internal_unitは正の数値である必要があります` };
  }

  const is_active =
    is_active_str?.toLowerCase() === "false" || is_active_str === "0" ? false : true;

  return {
    row: {
      OPERATION: operation as "ADD" | "UPD" | "DEL",
      product_code: product_code.trim(),
      product_name: product_name.trim(),
      internal_unit: internal_unit.trim() || "CAN",
      external_unit: external_unit.trim() || "KG",
      qty_per_internal_unit,
      customer_part_no: customer_part_no?.trim() || null,
      maker_item_code: maker_item_code?.trim() || null,
      is_active,
      _rowNumber: rowIndex,
    },
  };
}

/**
 * Parse product CSV file content
 *
 * Expected CSV format:
 * OPERATION,product_code,product_name,internal_unit,external_unit,qty_per_internal_unit,customer_part_no,maker_item_code,is_active
 *
 * @param csvText - CSV file content as string
 * @returns Parsed rows and errors
 */
export function parseProductCsv(csvText: string): {
  rows: ProductBulkRow[];
  errors: string[];
} {
  const rows: ProductBulkRow[] = [];
  const errors: string[] = [];

  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push("CSVファイルが空です");
    return { rows, errors };
  }

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const cols = parseCSVLine(line);
      const { row, error } = parseProductRow(cols, i + 1);

      if (error) {
        errors.push(error);
      } else if (row) {
        rows.push(row);
      }
    } catch (e) {
      errors.push(`行${i + 1}: 解析エラー - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { rows, errors };
}

/**
 * Generate product import template CSV
 *
 * @returns CSV template string with header and sample row
 */
export function generateProductTemplateCsv(): string {
  const header =
    "OPERATION,product_code,product_name,internal_unit,external_unit,qty_per_internal_unit,customer_part_no,maker_item_code,is_active";

  const sampleRow = "ADD,PROD001,サンプル商品,CAN,KG,1.0,CUST001,MAKER001,true";

  return `${header}\n${sampleRow}\n`;
}

/**
 * Parse CSV line handling quoted fields
 * @param line - CSV line
 * @returns Array of field values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current); // Push last field

  return result.map((field) => field.trim());
}
