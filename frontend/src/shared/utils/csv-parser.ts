/**
 * Shared CSV parsing and generation utilities
 *
 * These utilities eliminate duplication in CSV handling across features.
 */

/**
 * Parse CSV line handling quoted values correctly
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
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" → "
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator (not inside quotes)
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Push final field
  result.push(current);
  return result;
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
 * Generic CSV parser class
 *
 * Provides reusable CSV parsing logic with custom row parsing.
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
   * Parse CSV file
   *
   * @param file - File object from file input
   * @returns Promise resolving to parse result with rows and errors
   */
  async parseFile(file: File): Promise<CsvParseResult<TRow>> {
    const text = await file.text();
    return this.parseText(text);
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

    const lines = text.split("\n").filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      errors.push("CSVファイルが空です");
      return { rows, errors };
    }

    // Validate header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    const missingHeaders = this.config.headers.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`必須ヘッダが不足: ${missingHeaders.join(", ")}`);
      return { rows, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];

      try {
        const fields = parseCSVLine(line);

        // Build field map
        const data: Record<string, string> = {};
        headers.forEach((header, index) => {
          data[header] = fields[index]?.trim() || "";
        });

        // Validate required fields
        const missingFields = this.config.requiredFields.filter(
          (field) => !data[field] || data[field].trim() === ""
        );

        if (missingFields.length > 0) {
          errors.push(`行${lineNumber}: 必須項目が空: ${missingFields.join(", ")}`);
          continue;
        }

        // Parse row using custom parser
        const row = this.config.parseRow(data, lineNumber);

        if (row === null) {
          errors.push(`行${lineNumber}: データ検証エラー`);
          continue;
        }

        rows.push(row);
      } catch (error) {
        errors.push(
          `行${lineNumber}: パースエラー - ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { rows, errors };
  }

  /**
   * Generate CSV content from entities
   *
   * @param entities - Array of entities to convert to CSV
   * @param mapEntity - Function to convert entity to CSV fields
   * @returns CSV text content
   */
  generateCSV<TEntity>(entities: TEntity[], mapEntity: (e: TEntity) => string[]): string {
    const headerLine = this.config.headers.join(",");
    const dataLines = entities.map((entity) => {
      const fields = mapEntity(entity);
      // Quote fields that contain commas or quotes
      const quotedFields = fields.map((field) => {
        const str = String(field);
        if (str.includes(",") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      return quotedFields.join(",");
    });

    return [headerLine, ...dataLines].join("\n");
  }

  /**
   * Generate template CSV with headers only
   *
   * @returns CSV text with header row
   */
  generateTemplate(): string {
    return this.config.headers.join(",") + "\n";
  }
}
