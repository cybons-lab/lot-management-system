/**
 * SmartRead CSV Transformer
 *
 * TypeScript port of the Python SmartReadCsvTransformer
 * Transforms wide (horizontal) CSV data to long (vertical) format
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    console.log(`[TRANSFORM] Starting transformation of ${wideData.length} wide rows`);
    if (wideData.length > 0) {
      console.log(`[TRANSFORM] First row keys:`, Object.keys(wideData[0]));
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
      console.warn(`[TRANSFORM] Encountered ${errors.length} errors:`, errors);
    }
    console.log(
      `[TRANSFORM] Transformation complete: ${wideData.length} wide rows → ${longData.length} long rows, ${errors.length} errors`,
    );

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

    return details;
  }

  private extractSingleDetail(row: Record<string, any>, n: number): Record<string, any> {
    const detail: Record<string, any> = {};

    // Regular detail fields (材質コード1, 材質コード 1, 納入量1, etc)
    for (const fieldName of DETAIL_FIELDS) {
      // 複数のパターンを試行
      const keysToTry = [`${fieldName}${n}`, `${fieldName} ${n}`];
      if (n === 1) {
        keysToTry.push(fieldName);
      }

      for (const key of keysToTry) {
        if (key in row) {
          detail[fieldName] = this.normalizeValue(row[key]);
          break;
        }
      }
    }

    // Sub-detail fields (Lot No1-1, Lot No 1-1, Lot No-1, etc)
    for (const subField of SUB_DETAIL_FIELDS) {
      for (let subN = 1; subN <= 4; subN++) {
        // Max 4 sub-details
        const keysToTry = [`${subField}${n}-${subN}`, `${subField} ${n}-${subN}`];
        if (n === 1) {
          keysToTry.push(`${subField}-${subN}`);
        }

        for (const key of keysToTry) {
          if (key in row) {
            detail[`${subField}${subN}`] = this.normalizeValue(row[key]);
            break;
          }
        }
      }
    }
    return detail;
  }

  private isVerticalFormat(row: Record<string, any>): boolean {
    return DETAIL_FIELDS.some((f) => !(f + "1" in row) && !(f + " 1" in row) && f in row);
  }

  private isEmptyDetail(detail: Record<string, any>): boolean {
    // Check if ALL detail fields are empty
    // If ANY field has a value, it is NOT empty

    // Iterate all keys in the detail object
    const detailKeys = Object.keys(detail);
    console.log(`[isEmptyDetail] Checking detail:`, { keys: detailKeys, values: detail });

    for (const key of detailKeys) {
      if (key.startsWith("エラー_")) continue; // Ignore error flags
      const value = detail[key];
      const trimmedValue = value ? String(value).trim() : "";

      if (trimmedValue !== "") {
        console.log(
          `[isEmptyDetail] Found non-empty field: ${key} = "${trimmedValue}" -> NOT EMPTY`,
        );
        return false;
      }
    }

    console.log(`[isEmptyDetail] All fields empty -> EMPTY`);
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
        // common["発行日"] = ""; // Don't clear! Keep original for manual correction.
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
        // common["納入日"] = ""; // Don't clear!
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
        // detail["納入量"] = ""; // Don't clear? actually parseQuantity returns original on error.
        // It was: return [s, true];
        // So detail["納入量"] = parsed; sets it to original. Good.
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
