/**
 * Supplier Product CSV Utilities
 * CSV parsing and template generation for supplier product bulk import
 */

import type { SupplierProductBulkRow } from "../types/bulk-operation";

/**
 * Parse supplier product CSV file content
 *
 * Expected CSV format:
 * OPERATION,supplier_code,supplier_name,maker_part_no,display_name,base_unit,lead_time_days,notes
 *
 * @param csvText - CSV file content as string
 * @returns Parsed rows and errors
 */
/* eslint-disable complexity -- 業務分岐を明示的に維持するため */
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

      if (cols.length < 6) {
        errors.push(`行${i + 1}: 必須列が不足しています`);
        continue;
      }

      const [
        operation,
        supplier_code,
        supplier_name,
        maker_part_no,
        display_name,
        base_unit,
        lead_time_days_str,
        notes,
      ] = cols;

      // Validate operation
      if (!["ADD", "UPD", "DEL"].includes(operation)) {
        errors.push(`行${i + 1}: 無効なOPERATION値 (${operation})`);
        continue;
      }

      const lead_time_days = lead_time_days_str ? parseInt(lead_time_days_str, 10) : undefined;
      if (lead_time_days_str && isNaN(lead_time_days!)) {
        errors.push(`行${i + 1}: リードタイムは数値である必要があります`);
        continue;
      }

      rows.push({
        OPERATION: operation as "ADD" | "UPD" | "DEL",
        supplier_code: supplier_code.trim(),
        supplier_name: supplier_name.trim(),
        maker_part_no: maker_part_no.trim(),
        display_name: display_name.trim(),
        base_unit: base_unit.trim(),
        lead_time_days,
        notes: notes?.trim() || undefined,
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
    "OPERATION,supplier_code,supplier_name,maker_part_no,display_name,base_unit,lead_time_days,notes";

  const sampleRow = "ADD,SUP001,サンプル仕入先,ABC-12345,六角ボルト M10,EA,7,備考欄";

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
