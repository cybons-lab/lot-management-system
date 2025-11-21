/**
 * Product CSV Utilities
 */

import type { Product } from "../api/products-api";
import type { ProductBulkRow, BulkOperationType } from "../types/bulk-operation";

const CSV_HEADERS = [
  "OPERATION",
  "maker_part_code",
  "product_name",
  "base_unit",
  "consumption_limit_days",
] as const;

/**
 * Parse CSV text to ProductBulkRow[]
 */
export function parseProductCsv(csvText: string): { rows: ProductBulkRow[]; errors: string[] } {
  const lines = csvText.trim().split("\n");
  const rows: ProductBulkRow[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push("CSVファイルにデータ行がありません");
    return { rows, errors };
  }

  const header = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headerIndices = CSV_HEADERS.map((h) => header.indexOf(h));

  for (let i = 0; i < CSV_HEADERS.length; i++) {
    if (headerIndices[i] === -1) {
      errors.push(`必須カラム「${CSV_HEADERS[i]}」が見つかりません`);
    }
  }
  if (errors.length > 0) return { rows, errors };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const operation = values[headerIndices[0]!]?.toUpperCase() as BulkOperationType | undefined;

    if (!operation || !["ADD", "UPD", "DEL"].includes(operation)) {
      errors.push(`行${i + 1}: OPERATIONは ADD/UPD/DEL のいずれかを指定してください`);
      continue;
    }

    const makerPartCode = values[headerIndices[1]!] ?? "";
    if (!makerPartCode) {
      errors.push(`行${i + 1}: maker_part_codeは必須です`);
      continue;
    }

    const consumptionDaysStr = values[headerIndices[4]!];
    const consumptionDays = consumptionDaysStr ? parseInt(consumptionDaysStr, 10) : null;

    rows.push({
      _rowNumber: i + 1,
      OPERATION: operation,
      maker_part_code: makerPartCode,
      product_name: values[headerIndices[2]!] ?? "",
      base_unit: values[headerIndices[3]!] ?? "",
      consumption_limit_days: consumptionDays,
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
 * Generate CSV from products (for export/template)
 */
export function generateProductCsv(products: Product[], includeOperation = true): string {
  const headers = includeOperation ? CSV_HEADERS : CSV_HEADERS.slice(1);
  const lines = [headers.join(",")];

  for (const p of products) {
    const values = includeOperation
      ? [
          "UPD",
          p.maker_part_code,
          p.product_name,
          p.base_unit,
          p.consumption_limit_days?.toString() ?? "",
        ]
      : [
          p.maker_part_code,
          p.product_name,
          p.base_unit,
          p.consumption_limit_days?.toString() ?? "",
        ];
    lines.push(values.map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
  }

  return lines.join("\n");
}

/**
 * Generate empty template CSV
 */
export function generateProductTemplateCsv(): string {
  return [
    CSV_HEADERS.join(","),
    '"ADD","MAKER-001","サンプル商品","EA",""',
    '"UPD","MAKER-002","更新商品","KG","30"',
    '"DEL","MAKER-003","","",""',
  ].join("\n");
}
