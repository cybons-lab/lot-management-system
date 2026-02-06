/**
 * UOM Conversion CSV Utilities
 */
import type { UomConversionBulkRow } from "../types/bulk-operation";

export const CSV_HEADERS = ["product_code", "external_unit", "factor"] as const;
const REQUIRED_HEADERS = [...CSV_HEADERS];

function validateCsvHeaders(headers: string[]): string | null {
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length === 0) return null;
  return `必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`;
}

function buildRowData(headers: string[], values: string[]): Record<string, string> {
  const rowData: Record<string, string> = {};
  headers.forEach((header, idx) => {
    rowData[header] = values[idx] ?? "";
  });
  return rowData;
}

function validateRowData(
  rowData: Record<string, string>,
  rowNumber: number,
): { error?: string; factor?: number } {
  if (!rowData["product_code"]) return { error: `行${rowNumber}: product_codeは必須です` };
  if (!rowData["external_unit"]) return { error: `行${rowNumber}: external_unitは必須です` };
  if (!rowData["factor"]) return { error: `行${rowNumber}: factorは必須です` };

  const factorValue = Number(rowData["factor"]);
  if (Number.isNaN(factorValue)) {
    return { error: `行${rowNumber}: factorは数値である必要があります` };
  }
  return { factor: factorValue };
}

function parseCsvLine(
  line: string,
  headers: string[],
  rowNumber: number,
): { row?: UomConversionBulkRow; error?: string } {
  const values = line.split(",").map((value) => value.trim());
  if (values.length !== headers.length) {
    return { error: `行${rowNumber}: 列数が一致しません` };
  }

  const rowData = buildRowData(headers, values);
  const { error, factor } = validateRowData(rowData, rowNumber);
  if (error || factor === undefined) return { error };

  return {
    row: {
      OPERATION: "UPD",
      product_code: rowData["product_code"] ?? "",
      external_unit: rowData["external_unit"] ?? "",
      factor,
      _rowNumber: rowNumber,
    },
  };
}

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
  const headerError = validateCsvHeaders(headers);
  if (headerError) return { rows: [], errors: [headerError] };

  const rows: UomConversionBulkRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const rowNumber = i + 1;
    const { row, error } = parseCsvLine(line, headers, rowNumber);
    if (error) {
      errors.push(error);
      continue;
    }
    if (row) rows.push(row);
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
