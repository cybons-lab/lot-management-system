/**
 * Shared CSV parsing and generation utilities
 *
 * These utilities eliminate duplication in CSV handling across features.
 * Using PapaParse library for RFC 4180 compliant CSV processing.
 */

import Papa from "papaparse";

/**
 * Parse CSV line handling quoted values correctly
 *
 * @deprecated Use PapaParse directly or CsvParser class instead
 *
 * Properly handles:
 * - Quoted fields with commas: "Tokyo, Japan"
 * - Escaped quotes within quotes: "He said ""Hello"""
 * - Mixed quoted and unquoted fields
 *
 * @example
 * ```ts
 * parseCSVLine('A,B,C');
 * // Returns: ['A', 'B', 'C']
 *
 * parseCSVLine('A,"B,C",D');
 * // Returns: ['A', 'B,C', 'D']
 *
 * parseCSVLine('A,"B""C",D');
 * // Returns: ['A', 'B"C', 'D']
 * ```
 */
export function parseCSVLine(line: string): string[] {
  // Use PapaParse for single line parsing
  const result = Papa.parse<string[]>(line, {
    header: false,
    skipEmptyLines: false,
  });
  return result.data[0] || [];
}

/**
 * Download CSV file to user's browser
 *
 * Creates a Blob, generates download link, and triggers download.
 *
 * @example
 * ```ts
 * const csvContent = "Name,Age\nAlice,30\nBob,25";
 * downloadCSV(csvContent, "users.csv");
 * ```
 *
 * @param content - CSV file content
 * @param filename - Suggested filename for download
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  URL.revokeObjectURL(url);
}

/**
 * Generic CSV parser configuration
 */
export interface CsvParserConfig<TRow> {
  /** Expected CSV headers */
  headers: readonly string[];
  /** Required fields that must have non-empty values */
  requiredFields: string[];
  /** Parse a single row from field map to typed row object */
  parseRow: (data: Record<string, string>, rowNumber: number) => TRow | null;
}

/**
 * Generic CSV parser result
 */
export interface CsvParseResult<TRow> {
  /** Successfully parsed rows */
  rows: TRow[];
  /** Error messages from parsing */
  errors: string[];
}

/**
 * Generic CSV parser class using PapaParse
 *
 * Provides reusable CSV parsing logic with custom row parsing.
 * RFC 4180 compliant with robust error handling.
 *
 * @example
 * ```ts
 * interface CustomerRow {
 *   operation: "create" | "update" | "delete";
 *   customer_code: string;
 *   customer_name: string;
 * }
 *
 * const parser = new CsvParser<CustomerRow>({
 *   headers: ["operation", "customer_code", "customer_name"],
 *   requiredFields: ["operation", "customer_code"],
 *   parseRow: (data, rowNum) => {
 *     if (!["create", "update", "delete"].includes(data.operation)) {
 *       return null;
 *     }
 *     return {
 *       operation: data.operation as "create" | "update" | "delete",
 *       customer_code: data.customer_code,
 *       customer_name: data.customer_name || "",
 *     };
 *   },
 * });
 *
 * const result = await parser.parseFile(file);
 * ```
 */
export class CsvParser<TRow> {
  constructor(private config: CsvParserConfig<TRow>) {}

  /**
   * Parse CSV file using PapaParse
   *
   * @param file - File object from file input
   * @returns Promise resolving to parse result with rows and errors
   */
  async parseFile(file: File): Promise<CsvParseResult<TRow>> {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          const rows: TRow[] = [];
          const errors: string[] = [];

          // Check for parsing errors
          if (results.errors.length > 0) {
            results.errors.forEach((error) => {
              errors.push(`行${error.row}: ${error.message}`);
            });
          }

          // Validate headers
          const headers = results.meta.fields || [];
          const missingHeaders = this.config.headers.filter((h) => !headers.includes(h));
          if (missingHeaders.length > 0) {
            errors.push(`必須ヘッダが不足: ${missingHeaders.join(", ")}`);
            resolve({ rows, errors });
            return;
          }

          // Parse and validate each row
          results.data.forEach((data, index) => {
            const lineNumber = index + 2; // +2 for header and 0-index

            try {
              // Validate required fields
              const missingFields = this.config.requiredFields.filter(
                (field) => !data[field] || data[field].trim() === "",
              );

              if (missingFields.length > 0) {
                errors.push(`行${lineNumber}: 必須項目が空: ${missingFields.join(", ")}`);
                return;
              }

              // Parse row using custom parser
              const row = this.config.parseRow(data, lineNumber);

              if (row === null) {
                errors.push(`行${lineNumber}: データ検証エラー`);
                return;
              }

              rows.push(row);
            } catch (error) {
              errors.push(
                `行${lineNumber}: パースエラー - ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          });

          resolve({ rows, errors });
        },
        error: (error) => {
          resolve({ rows: [], errors: [error.message] });
        },
      });
    });
  }

  /**
   * Parse CSV text content
   *
   * @param text - CSV text content
   * @returns Parse result with rows and errors
   */
  parseText(text: string): CsvParseResult<TRow> {
    const rows: TRow[] = [];
    const errors: string[] = [];

    const results = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });

    // Check for parsing errors
    if (results.errors.length > 0) {
      results.errors.forEach((error) => {
        errors.push(`行${error.row}: ${error.message}`);
      });
    }

    // Validate headers
    const headers = results.meta.fields || [];
    const missingHeaders = this.config.headers.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`必須ヘッダが不足: ${missingHeaders.join(", ")}`);
      return { rows, errors };
    }

    // Parse and validate each row
    results.data.forEach((data, index) => {
      const lineNumber = index + 2; // +2 for header and 0-index

      try {
        // Validate required fields
        const missingFields = this.config.requiredFields.filter(
          (field) => !data[field] || data[field].trim() === "",
        );

        if (missingFields.length > 0) {
          errors.push(`行${lineNumber}: 必須項目が空: ${missingFields.join(", ")}`);
          return;
        }

        // Parse row using custom parser
        const row = this.config.parseRow(data, lineNumber);

        if (row === null) {
          errors.push(`行${lineNumber}: データ検証エラー`);
          return;
        }

        rows.push(row);
      } catch (error) {
        errors.push(
          `行${lineNumber}: パースエラー - ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    return { rows, errors };
  }

  /**
   * Generate CSV content from entities using PapaParse
   *
   * @param entities - Array of entities to convert to CSV
   * @param mapEntity - Function to convert entity to record object
   * @returns CSV text content
   */
  generateCSV<TEntity>(
    entities: TEntity[],
    mapEntity: (e: TEntity) => Record<string, unknown>,
  ): string {
    const data = entities.map(mapEntity);
    return Papa.unparse(data, {
      header: true,
      columns: this.config.headers as string[],
    });
  }

  /**
   * Generate template CSV with headers only
   *
   * @returns CSV text with header row
   */
  generateTemplate(): string {
    return Papa.unparse([], {
      header: true,
      columns: this.config.headers as string[],
    });
  }
}

/**
 * Simple CSV generation helper
 *
 * For quick CSV generation without CsvParser class.
 *
 * @example
 * ```ts
 * const csv = generateSimpleCSV(customers, ["customer_code", "customer_name"]);
 * downloadCSV(csv, "customers.csv");
 * ```
 */
export function generateSimpleCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: string[],
): string {
  return Papa.unparse(data, {
    header: true,
    columns,
  });
}
