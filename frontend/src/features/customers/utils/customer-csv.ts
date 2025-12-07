/**
 * Customer CSV Utilities
 * CSV parsing and template generation for customer bulk import
 */

import type { CustomerBulkRow } from "../types/bulk-operation";

/**
 * Parse customer CSV file content
 *
 * Expected CSV format:
 * OPERATION,customer_code,customer_name,address,contact_name,phone,email
 *
 * @param csvText - CSV file content as string
 * @returns Parsed rows and errors
 */
export function parseCustomerCsv(csvText: string): {
  rows: CustomerBulkRow[];
  errors: string[];
} {
  const rows: CustomerBulkRow[] = [];
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

      if (cols.length < 3) {
        errors.push(`行${i + 1}: 必須列が不足しています`);
        continue;
      }

      const [operation, customer_code, customer_name, address, contact_name, phone, email] = cols;

      // Validate operation
      if (!["ADD", "UPD", "DEL"].includes(operation)) {
        errors.push(`行${i + 1}: 無効なOPERATION値 (${operation})`);
        continue;
      }

      rows.push({
        OPERATION: operation as "ADD" | "UPD" | "DEL",
        customer_code: customer_code.trim(),
        customer_name: customer_name.trim(),
        address: address?.trim() || undefined,
        contact_name: contact_name?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        _rowNumber: i + 1,
      });
    } catch (e) {
      errors.push(`行${i + 1}: 解析エラー - ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { rows, errors };
}

/**
 * Generate customer import template CSV
 *
 * @returns CSV template string with header and sample row
 */
export function generateEmptyTemplate(): string {
  const header = "OPERATION,customer_code,customer_name,address,contact_name,phone,email";

  const sampleRow =
    "ADD,CUST001,サンプル得意先株式会社,東京都渋谷区,山田太郎,03-1234-5678,sample@example.com";

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
