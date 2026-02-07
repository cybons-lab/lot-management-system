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
    const line = lines[i]!.trim();
    if (!line) continue;

    const parsed = parseSupplierProductRow(parseCSVLine(line), i + 1);
    if ("error" in parsed) {
      errors.push(parsed.error);
      continue;
    }
    rows.push(parsed.row);
  }

  return { rows, errors };
}

type ParseSupplierProductRowResult = { row: SupplierProductBulkRow } | { error: string };

function parseSupplierProductRow(cols: string[], rowNumber: number): ParseSupplierProductRowResult {
  if (cols.length < 6) {
    return { error: `行${rowNumber}: 必須列が不足しています` };
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
  ] = cols as [
    string,
    string,
    string,
    string,
    string,
    string,
    string | undefined,
    string | undefined,
  ];

  if (!isSupplierProductOperation(operation)) {
    return { error: `行${rowNumber}: 無効なOPERATION値 (${operation})` };
  }

  const leadTimeDays = parseLeadTimeDays(lead_time_days_str, rowNumber);
  if ("error" in leadTimeDays) {
    return leadTimeDays;
  }

  return {
    row: {
      OPERATION: operation,
      supplier_code: supplier_code.trim(),
      supplier_name: supplier_name.trim(),
      maker_part_no: maker_part_no.trim(),
      display_name: display_name.trim(),
      base_unit: base_unit.trim(),
      ...(leadTimeDays.value !== undefined ? { lead_time_days: leadTimeDays.value } : {}),
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
      _rowNumber: rowNumber,
    },
  };
}

function parseLeadTimeDays(
  value: string | undefined,
  rowNumber: number,
): { value: number | undefined } | { error: string } {
  if (!value) return { value: undefined };
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return { error: `行${rowNumber}: リードタイムは数値である必要があります` };
  }
  return { value: parsed };
}

function isSupplierProductOperation(value: string): value is SupplierProductBulkRow["OPERATION"] {
  return value === "ADD" || value === "UPD" || value === "DEL";
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
