/**
 * Customer CSV Utilities
 * CSV解析/生成ユーティリティ
 *
 * このファイルは他のマスタ（Warehouses, Products, Suppliers等）でも
 * 流用できるパターンとして設計されています。
 */

import type { Customer } from "../api";
import type { BulkOperationType, CustomerBulkRow } from "../types/bulk-operation";

/**
 * CSVヘッダー定義
 */
export const CSV_HEADERS = ["OPERATION", "customer_code", "customer_name"] as const;

/**
 * CSVファイルをパースしてCustomerBulkRow配列に変換
 *
 * @param file CSVファイル
 * @returns パース結果
 */
export async function parseCustomerCsv(
  file: File,
): Promise<{ rows: CustomerBulkRow[]; errors: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { rows: [], errors: ["CSVファイルにデータ行がありません"] };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return { rows: [], errors: ["ヘッダー行が見つかりません"] };
  }
  const headers = headerLine.split(",").map((h) => h.trim());

  // ヘッダー検証
  const requiredHeaders = ["OPERATION", "customer_code", "customer_name"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`必須ヘッダーが見つかりません: ${missingHeaders.join(", ")}`],
    };
  }

  const rows: CustomerBulkRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowNumber = i + 1;

    // 列数チェック
    if (values.length !== headers.length) {
      errors.push(
        `行${rowNumber}: 列数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`,
      );
      continue;
    }

    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index] ?? "";
    });

    // OPERATION検証
    const operation = rowData["OPERATION"]?.toUpperCase() as BulkOperationType;
    if (!["ADD", "UPD", "DEL"].includes(operation)) {
      // TODO: backend: OPERATION空欄時のデフォルト動作を確認
      // 現在は空欄の場合ADDとして扱う
      if (!rowData["OPERATION"] || rowData["OPERATION"].trim() === "") {
        rowData["OPERATION"] = "ADD";
      } else {
        errors.push(
          `行${rowNumber}: 不正なOPERATION値「${rowData["OPERATION"]}」（ADD/UPD/DELのみ有効）`,
        );
        continue;
      }
    }

    // 必須フィールド検証
    if (!rowData["customer_code"]) {
      errors.push(`行${rowNumber}: customer_codeは必須です`);
      continue;
    }

    // DEL以外はcustomer_nameも必須
    if (operation !== "DEL" && !rowData["customer_name"]) {
      errors.push(`行${rowNumber}: customer_nameは必須です（DEL以外）`);
      continue;
    }

    rows.push({
      OPERATION: rowData["OPERATION"]?.toUpperCase() as BulkOperationType,
      customer_code: rowData["customer_code"] ?? "",
      customer_name: rowData["customer_name"] ?? "",
      _rowNumber: rowNumber,
    });
  }

  return { rows, errors };
}

/**
 * CSV行をパース（カンマ区切り、ダブルクォート対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
 * Customer配列をCSV文字列に変換（エクスポート用）
 *
 * @param customers 顧客データ配列
 * @param includeOperation OPERATION列を含めるか（インポートテンプレートとして使う場合true）
 */
export function customersToCSV(customers: Customer[], includeOperation = true): string {
  const headers = includeOperation
    ? CSV_HEADERS.join(",")
    : CSV_HEADERS.filter((h) => h !== "OPERATION").join(",");

  const rows = customers.map((customer) => {
    const values = includeOperation
      ? ["UPD", escapeCSVValue(customer.customer_code), escapeCSVValue(customer.customer_name)]
      : [escapeCSVValue(customer.customer_code), escapeCSVValue(customer.customer_name)];
    return values.join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * 空のCSVテンプレートを生成
 */
export function generateEmptyTemplate(): string {
  const headers = CSV_HEADERS.join(",");
  const exampleRow = "ADD,CUST-001,サンプル得意先";
  return [headers, exampleRow].join("\n");
}

/**
 * CSV値をエスケープ
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * CSVファイルをダウンロード
 */
export function downloadCSV(content: string, filename: string): void {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
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
