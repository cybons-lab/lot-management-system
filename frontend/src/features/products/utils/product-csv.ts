/**
 * Product CSV Utilities
 */

import type { Product } from "../api";
import type { ProductBulkRow, BulkOperationType } from "../types/bulk-operation";

const CSV_HEADERS = [
  "OPERATION",
  "product_code",
  "product_name",
  "internal_unit",
  "external_unit",
  "qty_per_internal_unit",
  "customer_part_no",
  "maker_item_code",
  "is_active",
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

    const productCode = values[headerIndices[1]!] ?? "";
    if (!productCode) {
      errors.push(`行${i + 1}: product_codeは必須です`);
      continue;
    }

    const qtyPerInternalUnitStr = values[headerIndices[5]!];
    const qtyPerInternalUnit = qtyPerInternalUnitStr ? Number(qtyPerInternalUnitStr) : NaN;
    if (Number.isNaN(qtyPerInternalUnit)) {
      errors.push(`行${i + 1}: qty_per_internal_unitは数値で入力してください`);
      continue;
    }

    const isActiveRaw = values[headerIndices[8]!] ?? "true";
    const isActive = isActiveRaw.toLowerCase() !== "false";

    rows.push({
      _rowNumber: i + 1,
      OPERATION: operation,
      product_code: productCode,
      product_name: values[headerIndices[2]!] ?? "",
      internal_unit: values[headerIndices[3]!] ?? "",
      external_unit: values[headerIndices[4]!] ?? "",
      qty_per_internal_unit: qtyPerInternalUnit,
      customer_part_no: values[headerIndices[6]!] || null,
      maker_item_code: values[headerIndices[7]!] || null,
      is_active: isActive,
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
        p.product_code,
        p.product_name,
        p.internal_unit,
        p.external_unit,
        p.qty_per_internal_unit?.toString() ?? "",
        p.customer_part_no ?? "",
        p.maker_item_code ?? "",
        p.is_active ? "true" : "false",
      ]
      : [
        p.product_code,
        p.product_name,
        p.internal_unit,
        p.external_unit,
        p.qty_per_internal_unit?.toString() ?? "",
        p.customer_part_no ?? "",
        p.maker_item_code ?? "",
        p.is_active ? "true" : "false",
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
    '"ADD","PROD-001","サンプル商品","CAN","KG","1","CUST-001","MAKER-001","true"',
    '"UPD","PROD-002","更新商品","CAN","KG","1","","","false"',
    '"DEL","PROD-003","","","","","","",""',
  ].join("\n");
}
