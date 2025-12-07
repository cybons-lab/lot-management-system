/**
 * Customer Item CSV Utilities
 */
import type { CustomerItemBulkRow } from "../types/bulk-operation";

const REQUIRED_HEADERS = ["customer_code", "external_product_code", "product_code", "base_unit"];

export const CSV_HEADERS = [
  "customer_code",
  "external_product_code",
  "product_code",
  "supplier_code",
  "base_unit",
  "pack_unit",
  "pack_quantity",
  "special_instructions",
] as const;

function parseHeaders(headerLine?: string) {
  if (!headerLine) {
    return { headers: null, errors: ["ヘッダー行が見つかりません"] };
  }

  const headers = headerLine.split(",").map((h) => h.trim());
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return {
      headers: null,
      errors: [`必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`],
    };
  }

  return { headers, errors: [] };
}

function buildRow(headers: string[], values: string[], rowNumber: number) {
  const rowData: Record<string, string> = {};
  headers.forEach((header, idx) => {
    rowData[header] = values[idx] ?? "";
  });

  const requiredErrors = REQUIRED_HEADERS.filter((header) => !rowData[header]).map(
    (header) => `行${rowNumber}: ${header}は必須です`,
  );

  if (requiredErrors.length > 0) {
    return { row: null, errors: requiredErrors };
  }

  return {
    row: {
      customer_code: rowData["customer_code"] ?? "",
      external_product_code: rowData["external_product_code"] ?? "",
      product_code: rowData["product_code"] ?? "",
      supplier_code: rowData["supplier_code"] || undefined,
      base_unit: rowData["base_unit"] ?? "",
      pack_unit: rowData["pack_unit"] || undefined,
      pack_quantity: rowData["pack_quantity"] ? Number(rowData["pack_quantity"]) : undefined,
      special_instructions: rowData["special_instructions"] || undefined,
      _rowNumber: rowNumber,
    } as CustomerItemBulkRow,
    errors: [],
  };
}

export async function parseCustomerItemCsv(
  file: File,
): Promise<{ rows: CustomerItemBulkRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], errors: ["CSVファイルにデータ行がありません"] };
  }

  const { headers, errors: headerErrors } = parseHeaders(lines[0]);
  if (!headers) {
    return { rows: [], errors: headerErrors };
  }

  const rows: CustomerItemBulkRow[] = [];
  const errors: string[] = [...headerErrors];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const rowNumber = i + 1;

    if (values.length !== headers.length) {
      errors.push(`行${rowNumber}: 列数が一致しません`);
      continue;
    }

    const { row, errors: rowErrors } = buildRow(headers, values, rowNumber);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    if (row) {
      rows.push(row);
    }
  }

  return { rows, errors };
}

export function generateEmptyTemplate(): string {
  return [CSV_HEADERS.join(","), "C001,EXT-001,P001,S001,PCS,BOX,10,特記事項あり"].join("\n");
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
