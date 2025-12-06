/**
 * UOM Conversion CSV Utilities
 */
// CSVパース処理で複数のバリデーション分岐があるため抑制
/* eslint-disable complexity */
import type { UomConversionBulkRow } from "../types/bulk-operation";

export const CSV_HEADERS = ["product_code", "external_unit", "factor"] as const;

export async function parseUomConversionCsv(
  file: File,
): Promise<{ rows: UomConversionBulkRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], errors: ["CSVファイルにデータ行がありません"] };
  }

  const headerLine = lines[0];
  if (!headerLine) return { rows: [], errors: ["ヘッダー行が見つかりません"] };
  const headers = headerLine.split(",").map((h) => h.trim());

  const requiredHeaders = ["product_code", "external_unit", "factor"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { rows: [], errors: [`必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`] };
  }

  const rows: UomConversionBulkRow[] = [];
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

    if (!rowData["product_code"]) {
      errors.push(`行${rowNumber}: product_codeは必須です`);
      continue;
    }
    if (!rowData["external_unit"]) {
      errors.push(`行${rowNumber}: external_unitは必須です`);
      continue;
    }
    if (!rowData["factor"]) {
      errors.push(`行${rowNumber}: factorは必須です`);
      continue;
    }
    if (isNaN(Number(rowData["factor"]))) {
      errors.push(`行${rowNumber}: factorは数値である必要があります`);
      continue;
    }

    rows.push({
      product_code: rowData["product_code"] ?? "",
      external_unit: rowData["external_unit"] ?? "",
      factor: Number(rowData["factor"]),
      _rowNumber: rowNumber,
    });
  }

  return { rows, errors };
}

export function generateEmptyTemplate(): string {
  return [CSV_HEADERS.join(","), "P001,BOX,10"].join("\n");
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
