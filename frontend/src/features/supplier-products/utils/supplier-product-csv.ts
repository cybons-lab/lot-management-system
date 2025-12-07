/**
 * Supplier Product CSV Utilities
 * CSV parsing and template generation for supplier product bulk import
 */

import type { SupplierProductBulkRow } from "../types/bulk-operation";

/**
 * Parse supplier product CSV file content
 *
 * Expected CSV format:
 * OPERATION,supplier_code,supplier_name,product_code,product_name,order_unit,order_lot_size
 *
 * @param csvText - CSV file content as string
 * @returns Parsed rows and errors
 */
/* eslint-disable complexity */
export function parseSupplierProductCsv(csvText: string): {
  rows: SupplierProductBulkRow[];
  errors: string[];
} {
  const rows: SupplierProductBulkRow[] = [];
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

      if (cols.length < 5) {
        errors.push(`行${i + 1}: 必須列が不足しています`);
        continue;
      }

      const [
        operation,
        supplier_code,
        supplier_name,
        product_code,
        product_name,
        order_unit,
        order_lot_size_str,
      ] = cols;

      // Validate operation
      if (!["ADD", "UPD", "DEL"].includes(operation)) {
        errors.push(`行${i + 1}: 無効なOPERATION値 (${operation})`);
        continue;
      }

      const order_lot_size = order_lot_size_str ? parseFloat(order_lot_size_str) : undefined;
      if (order_lot_size_str && isNaN(order_lot_size!)) {
        errors.push(`行${i + 1}: 発注ロットサイズは数値である必要があります`);
        continue;
      }

      rows.push({
        OPERATION: operation as "ADD" | "UPD" | "DEL",
        supplier_code: supplier_code.trim(),
        supplier_name: supplier_name.trim(),
        product_code: product_code.trim(),
        product_name: product_name.trim(),
        order_unit: order_unit?.trim() || undefined,
        order_lot_size,
        _rowNumber: i + 1,
      });
    } catch (e) {
      errors.push(`行${i + 1}: 解析エラー - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { rows, errors };
}

/**
 * Generate supplier product import template CSV
 *
 * @returns CSV template string with header and sample row
 */
export function generateSupplierProductTemplateCsv(): string {
  const header =
    "OPERATION,supplier_code,supplier_name,product_code,product_name,order_unit,order_lot_size";

  const sampleRow = "ADD,SUP001,サンプル仕入先,PROD001,サンプル商品,CS,10";

  return `${header}\n${sampleRow}\n`;
}

/**
 * Download CSV as file
 * @param csvContent - CSV content
 * @param filename - Target filename
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
