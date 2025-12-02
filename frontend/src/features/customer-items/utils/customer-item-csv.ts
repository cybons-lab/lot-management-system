/**
 * Customer Item CSV Utilities
 */
/* eslint-disable complexity */
import type { CustomerItemBulkRow } from "../types/bulk-operation";

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

export async function parseCustomerItemCsv(
  file: File,
): Promise<{ rows: CustomerItemBulkRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], errors: ["CSVファイルにデータ行がありません"] };
  }

  const headerLine = lines[0];
  if (!headerLine) return { rows: [], errors: ["ヘッダー行が見つかりません"] };
  const headers = headerLine.split(",").map((h) => h.trim());

  const requiredHeaders = ["customer_code", "external_product_code", "product_code", "base_unit"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { rows: [], errors: [`必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`] };
  }

  const rows: CustomerItemBulkRow[] = [];
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

    if (!rowData["customer_code"]) {
      errors.push(`行${rowNumber}: customer_codeは必須です`);
      continue;
    }
    if (!rowData["external_product_code"]) {
      errors.push(`行${rowNumber}: external_product_codeは必須です`);
      continue;
    }
    if (!rowData["product_code"]) {
      errors.push(`行${rowNumber}: product_codeは必須です`);
      continue;
    }
    if (!rowData["base_unit"]) {
      errors.push(`行${rowNumber}: base_unitは必須です`);
      continue;
    }

    rows.push({
      customer_code: rowData["customer_code"] ?? "",
      external_product_code: rowData["external_product_code"] ?? "",
      product_code: rowData["product_code"] ?? "",
      supplier_code: rowData["supplier_code"] || undefined,
      base_unit: rowData["base_unit"] ?? "",
      pack_unit: rowData["pack_unit"] || undefined,
      pack_quantity: rowData["pack_quantity"] ? Number(rowData["pack_quantity"]) : undefined,
      special_instructions: rowData["special_instructions"] || undefined,
      _rowNumber: rowNumber,
    });
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
