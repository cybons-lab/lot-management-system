/**
 * SmartRead CSV Transformer
 *
 * TypeScript port of the Python SmartReadCsvTransformer
 * Transforms wide (horizontal) CSV data to long (vertical) format
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { logger } from "./logger";

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string | null;
}

export interface TransformResult {
  long_data: Array<Record<string, any>>;
  errors: ValidationError[];
}

// Common fields (copied to all detail rows)
const COMMON_FIELDS = [
  "ファイル名",
  "ページ番号",
  "テンプレート名",
  "発行日",
  "納品書No",
  "発注者",
  "発注事業所",
  "受注者",
  "出荷場所名称",
  "納入日",
  "便",
];

// Detail fields (numbered, e.g. 材質コード1, 材質コード2)
const DETAIL_FIELDS = ["材質コード", "材質サイズ", "単位", "納入量", "アイテム", "購買", "次区"];

// Sub-detail fields (e.g. Lot No1-1, Lot No1-2)
const SUB_DETAIL_FIELDS = ["Lot No", "梱包数"];

export class SmartReadCsvTransformer {
  private maxDetails: number;

  constructor(maxDetails: number = 20) {
    this.maxDetails = maxDetails;
  }

  /**
   * Transform wide format to long format
   *
   * Converts data where multiple details are in one row (horizontal)
   * to data where each detail is a separate row (vertical)
   */
  transformToLong(
    wideData: Array<Record<string, any>>,
    skipEmpty: boolean = true,
  ): TransformResult {
    logger.info("CSV変換開始", { wideRowCount: wideData.length });
    if (wideData.length > 0) {
      logger.debug("横持ちデータキー", { keys: Object.keys(wideData[0]).slice(0, 20) });
    }

    const longData: Array<Record<string, any>> = [];
    const errors: ValidationError[] = [];

    for (let rowIdx = 0; rowIdx < wideData.length; rowIdx++) {
      const row = wideData[rowIdx];

      // Extract common fields
      let common = this.extractCommonFields(row);

      // Validate common fields
      const [validatedCommon, commonErrors] = this.validateCommonFields(common, rowIdx);
      common = validatedCommon;
      errors.push(...commonErrors);

      // Extract details
      const details = this.extractDetails(row);

      for (let detailIdx = 0; detailIdx < details.length; detailIdx++) {
        let detail = details[detailIdx];

        // Skip empty details
        if (skipEmpty && this.isEmptyDetail(detail)) {
          continue;
        }

        // Validate detail
        const [validatedDetail, detailErrors] = this.validateDetail(detail, rowIdx, detailIdx + 1);
        detail = validatedDetail;
        errors.push(...detailErrors);

        // Merge common and detail
        const longRow = {
          ...common,
          明細番号: detailIdx + 1,
          ...detail,
        };
        longData.push(longRow);
      }
    }

    if (errors.length > 0) {
      logger.warn("CSV変換中にエラー発生", { errorCount: errors.length });
    }
    logger.info("CSV変換完了", {
      wideRowCount: wideData.length,
      longRowCount: longData.length,
      errorCount: errors.length,
    });

    return {
      long_data: longData,
      errors,
    };
  }

  private extractCommonFields(row: Record<string, any>): Record<string, any> {
    const common: Record<string, any> = {};
    for (const fieldName of COMMON_FIELDS) {
      if (fieldName in row) {
        common[fieldName] = this.normalizeValue(row[fieldName]);
      }
    }
    return common;
  }

  private extractDetails(row: Record<string, any>): Array<Record<string, any>> {
    const details: Array<Record<string, any>> = [];

    logger.debug("明細抽出開始", { columnCount: Object.keys(row).length });

    for (let n = 1; n <= this.maxDetails; n++) {
      const detail = this.extractSingleDetail(row, n);

      // Only add if detail has data
      if (!this.isEmptyDetail(detail)) {
        details.push(detail);

        // If matched without numbering for n=1, skip further details (it's a vertical row)
        if (this.isVerticalFormat(row)) {
          break;
        }
      }
    }

    logger.debug("明細抽出完了", { detailCount: details.length });
    return details;
  }

  private extractSingleDetail(row: Record<string, any>, n: number): Record<string, any> {
    const detail: Record<string, any> = {};

    // Normalize row keys (全角数字→半角数字) to match patterns
    const normalizedRow = this.createNormalizedRow(row);

    // Extract regular detail fields
    this.extractDetailFields(detail, normalizedRow, n);

    // Extract sub-detail fields (Lot No, 梱包数)
    this.extractSubDetailFields(detail, normalizedRow, n);

    return detail;
  }

  private createNormalizedRow(row: Record<string, any>): Record<string, any> {
    const normalizedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = this.normalizeKey(key);
      normalizedRow[normalizedKey] = value;
    }
    return normalizedRow;
  }

  private extractDetailFields(
    detail: Record<string, any>,
    normalizedRow: Record<string, any>,
    n: number,
  ): void {
    for (const fieldName of DETAIL_FIELDS) {
      const keysToTry = [`${fieldName}${n}`, `${fieldName} ${n}`];
      if (n === 1) {
        keysToTry.push(fieldName);
      }

      let matched = false;
      for (const key of keysToTry) {
        if (key in normalizedRow) {
          detail[fieldName] = this.normalizeValue(normalizedRow[key]);
          matched = true;
          break;
        }
      }

      if (!matched && n === 1) {
        // Show what similar keys exist in normalized row (debug only)
        const similarKeys = Object.keys(normalizedRow).filter((k) =>
          k.toLowerCase().includes(fieldName.toLowerCase()),
        );
        if (similarKeys.length > 0) {
          logger.debug(`フィールド "${fieldName}" 未検出`, { triedKeys: keysToTry, similarKeys });
        }
      }
    }
  }

  private extractSubDetailFields(
    detail: Record<string, any>,
    normalizedRow: Record<string, any>,
    n: number,
  ): void {
    for (const subField of SUB_DETAIL_FIELDS) {
      for (let subN = 1; subN <= 4; subN++) {
        const keysToTry = [`${subField}${n}-${subN}`, `${subField} ${n}-${subN}`];
        if (n === 1) {
          keysToTry.push(`${subField}-${subN}`);
        }

        for (const key of keysToTry) {
          if (key in normalizedRow) {
            detail[`${subField}${subN}`] = this.normalizeValue(normalizedRow[key]);
            break;
          }
        }
      }
    }
  }

  private normalizeKey(key: string): string {
    // Normalize column names: 全角数字→半角数字, trim whitespace
    const trimmed = key.trim();

    // Full-width to half-width number conversion
    const fullWidthNumbers = "０１２３４５６７８９";
    const halfWidthNumbers = "0123456789";

    let result = "";
    for (const char of trimmed) {
      const idx = fullWidthNumbers.indexOf(char);
      result += idx >= 0 ? halfWidthNumbers[idx] : char;
    }

    return result;
  }

  private isVerticalFormat(row: Record<string, any>): boolean {
    return DETAIL_FIELDS.some((f) => !(f + "1" in row) && !(f + " 1" in row) && f in row);
  }

  private isEmptyDetail(detail: Record<string, any>): boolean {
    // Check if ALL detail fields are empty
    // If ANY field has a value, it is NOT empty

    const detailKeys = Object.keys(detail);

    for (const key of detailKeys) {
      if (key.startsWith("エラー_")) continue; // Ignore error flags
      const value = detail[key];
      const trimmedValue = value ? String(value).trim() : "";

      if (trimmedValue !== "") {
        return false;
      }
    }

    return true;
  }

  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    const s = String(value).trim();

    // Full-width to half-width conversion (numbers, letters, some symbols)
    const fullWidth =
      "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
    const halfWidth = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    let result = "";
    for (const char of s) {
      const idx = fullWidth.indexOf(char);
      result += idx >= 0 ? halfWidth[idx] : char;
    }

    return result;
  }

  private validateCommonFields(
    common: Record<string, any>,
    rowIdx: number,
  ): [Record<string, any>, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Validate 発行日 (issue date)
    if ("発行日" in common) {
      const original = common["発行日"];
      const [parsed, hasError] = this.parseDate(original);
      if (hasError) {
        errors.push({
          row: rowIdx,
          field: "発行日",
          message: "日付形式が不正です",
          value: original || null,
        });
        common["エラー_発行日形式"] = 1;
      } else {
        common["発行日"] = parsed;
        common["エラー_発行日形式"] = 0;
      }
    }

    // Validate 納入日 (delivery date)
    if ("納入日" in common) {
      const original = common["納入日"];
      const [parsed, hasError] = this.parseDate(original);
      if (hasError) {
        errors.push({
          row: rowIdx,
          field: "納入日",
          message: "日付形式が不正です",
          value: original || null,
        });
        common["エラー_納入日形式"] = 1;
      } else {
        common["納入日"] = parsed;
        common["エラー_納入日形式"] = 0;
      }
    }

    return [common, errors];
  }

  private validateDetail(
    detail: Record<string, any>,
    rowIdx: number,
    detailIdx: number,
  ): [Record<string, any>, ValidationError[]] {
    const errors: ValidationError[] = [];

    // Validate 次区 (first character must be alphabet)
    if ("次区" in detail) {
      const jiku = detail["次区"];
      if (jiku && !/^[A-Za-z]/.test(jiku)) {
        errors.push({
          row: rowIdx,
          field: `次区(明細${detailIdx})`,
          message: "次区は先頭がアルファベットである必要があります",
          value: jiku || null,
        });
        detail["エラー_次区形式"] = 1;
      } else {
        detail["エラー_次区形式"] = 0;
      }
    }

    // Validate 納入量 (quantity must be non-negative number)
    if ("納入量" in detail) {
      const quantity = detail["納入量"];
      const [parsed, hasError] = this.parseQuantity(quantity);
      if (hasError) {
        errors.push({
          row: rowIdx,
          field: `納入量(明細${detailIdx})`,
          message: "納入量は0以上の数値である必要があります",
          value: quantity || null,
        });
        detail["エラー_納入量"] = 1;
      } else {
        detail["納入量"] = parsed;
        detail["エラー_納入量"] = 0;
      }
    }

    return [detail, errors];
  }

  private parseDate(value: string): [string, boolean] {
    if (!value) {
      return ["", false];
    }

    const s = this.normalizeValue(value);

    // Try various date formats
    const formats = [
      { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parts: 3 },
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parts: 3 },
      { regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, parts: 3 },
      { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, parts: 3 },
      { regex: /^(\d{4})\/(\d{1,2})$/, parts: 2 },
      { regex: /^(\d{4})-(\d{1,2})$/, parts: 2 },
      { regex: /^(\d{4})年(\d{1,2})月$/, parts: 2 },
      { regex: /^(\d{4})年$/, parts: 1 },
      { regex: /^(\d{4})$/, parts: 1 },
    ];

    for (const { regex, parts } of formats) {
      const match = s.match(regex);
      if (match) {
        return this.formatMatchedDate(match, parts);
      }
    }

    return ["", true];
  }

  private formatMatchedDate(match: RegExpMatchArray, parts: number): [string, boolean] {
    const year = parseInt(match[1], 10);
    const month = parts >= 2 ? parseInt(match[2], 10) : 1;
    const day = parts >= 3 ? parseInt(match[3], 10) : 1;

    // Range check
    if (
      year < 1900 ||
      year > 9999 ||
      (parts >= 2 && (month < 1 || month > 12)) ||
      (parts >= 3 && (day < 1 || day > 31))
    ) {
      return ["", true];
    }

    // Format as YYYY/MM/DD
    const formatted = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
    return [formatted, false];
  }

  private parseQuantity(value: string): [string, boolean] {
    if (!value) {
      return ["", false];
    }

    let s = this.normalizeValue(value);

    // Remove commas (1,000 → 1000)
    s = s.replace(/,/g, "");

    // Validate numeric format (integer or decimal)
    // Supports: 123, 123.45, .45, 123.
    if (!/^-?\d*\.?\d*$/.test(s) || s === "." || s === "-" || s === "-.") {
      return [s, true];
    }

    const num = parseFloat(s);
    if (isNaN(num) || num < 0) {
      return [s, true];
    }

    // Return as integer if whole number
    if (Number.isInteger(num)) {
      return [String(Math.floor(num)), false];
    }

    return [String(num), false];
  }
}
