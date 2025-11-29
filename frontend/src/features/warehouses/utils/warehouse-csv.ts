/**
 * Warehouse CSV Utilities
 */
import type { Warehouse } from "../api";
import type { BulkOperationType, WarehouseBulkRow } from "../types/bulk-operation";

export const CSV_HEADERS = [
  "OPERATION",
  "warehouse_code",
  "warehouse_name",
  "warehouse_type",
] as const;

export async function parseWarehouseCsv(
  file: File,
): Promise<{ rows: WarehouseBulkRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], errors: ["CSVファイルにデータ行がありません"] };
  }

  const headerLine = lines[0];
  if (!headerLine) return { rows: [], errors: ["ヘッダー行が見つかりません"] };
  const headers = headerLine.split(",").map((h) => h.trim());

  const requiredHeaders = ["OPERATION", "warehouse_code", "warehouse_name", "warehouse_type"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { rows: [], errors: [`必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`] };
  }

  const rows: WarehouseBulkRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split(",").map((v) => v.trim());
    const rowNumber = i + 1;

    if (values.length !== headers.length) {
      errors.push(`行${rowNumber}: 列数が一致しません`);
      continue;
    }

    const rowData: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowData[header] = values[idx] ?? "";
    });

    const operation = (rowData["OPERATION"]?.toUpperCase() || "ADD") as BulkOperationType;
    if (!["ADD", "UPD", "DEL"].includes(operation)) {
      errors.push(`行${rowNumber}: 不正なOPERATION値`);
      continue;
    }

    if (!rowData["warehouse_code"]) {
      errors.push(`行${rowNumber}: warehouse_codeは必須です`);
      continue;
    }

    if (operation !== "DEL" && !rowData["warehouse_name"]) {
      errors.push(`行${rowNumber}: warehouse_nameは必須です`);
      continue;
    }

    rows.push({
      OPERATION: operation,
      warehouse_code: rowData["warehouse_code"] ?? "",
      warehouse_name: rowData["warehouse_name"] ?? "",
      warehouse_type: rowData["warehouse_type"] ?? "internal",
      _rowNumber: rowNumber,
    });
  }

  return { rows, errors };
}

export function warehousesToCSV(warehouses: Warehouse[], includeOperation = true): string {
  const headers = includeOperation
    ? CSV_HEADERS.join(",")
    : CSV_HEADERS.filter((h) => h !== "OPERATION").join(",");

  const rows = warehouses.map((w) => {
    const values = includeOperation
      ? ["UPD", w.warehouse_code, w.warehouse_name, w.warehouse_type]
      : [w.warehouse_code, w.warehouse_name, w.warehouse_type];
    return values.join(",");
  });

  return [headers, ...rows].join("\n");
}

export function generateEmptyTemplate(): string {
  return [CSV_HEADERS.join(","), "ADD,WH-001,サンプル倉庫,internal"].join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
