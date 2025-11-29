/**
 * Supplier CSV Utilities
 */

import type { Supplier } from "../api";
import type { SupplierBulkRow, BulkOperationType } from "../types/bulk-operation";

const CSV_HEADERS = ["OPERATION", "supplier_code", "supplier_name"] as const;

/**
 * Parse CSV text to SupplierBulkRow[]
 */
export function parseSupplierCsv(csvText: string): { rows: SupplierBulkRow[]; errors: string[] } {
  const lines = csvText.trim().split("\n");
  const rows: SupplierBulkRow[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push("CSVファイルにデータ行がありません");
    return { rows, errors };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    errors.push("ヘッダー行が見つかりません");
    return { rows, errors };
  }

  const header = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headerIndices = CSV_HEADERS.map((h) => header.indexOf(h));

  for (let i = 0; i < CSV_HEADERS.length; i++) {
    if (headerIndices[i] === -1) {
      errors.push(`必須カラム「${CSV_HEADERS[i]}」が見つかりません`);
    }
  }
  if (errors.length > 0) return { rows, errors };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const values = parseCsvLine(line.trim());
    const operationIndex = headerIndices[0];
    const codeIndex = headerIndices[1];
    const nameIndex = headerIndices[2];

    // These indices are guaranteed to be valid (not -1) by the check above
    if (operationIndex === undefined || codeIndex === undefined || nameIndex === undefined) {
      continue;
    }

    const operation = values[operationIndex]?.toUpperCase() as BulkOperationType | undefined;

    if (!operation || !["ADD", "UPD", "DEL"].includes(operation)) {
      errors.push(`行${i + 1}: OPERATIONは ADD/UPD/DEL のいずれかを指定してください`);
      continue;
    }

    const supplierCode = values[codeIndex] ?? "";
    if (!supplierCode) {
      errors.push(`行${i + 1}: supplier_codeは必須です`);
      continue;
    }

    rows.push({
      _rowNumber: i + 1,
      OPERATION: operation,
      supplier_code: supplierCode,
      supplier_name: values[nameIndex] ?? "",
    });
  }

  return { rows, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Generate CSV from suppliers (for export/template)
 */
export function generateSupplierCsv(suppliers: Supplier[], includeOperation = true): string {
  const headers = includeOperation ? CSV_HEADERS : CSV_HEADERS.slice(1);
  const lines = [headers.join(",")];

  for (const s of suppliers) {
    const values = includeOperation
      ? ["UPD", s.supplier_code, s.supplier_name]
      : [s.supplier_code, s.supplier_name];
    lines.push(values.map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
  }

  return lines.join("\n");
}

/**
 * Generate empty template CSV
 */
export function generateSupplierTemplateCsv(): string {
  return [
    CSV_HEADERS.join(","),
    '"ADD","SUP-001","サンプル仕入先"',
    '"UPD","SUP-002","更新仕入先"',
    '"DEL","SUP-003",""',
  ].join("\n");
}
