import { describe, it, expect } from "vitest";

import { SmartReadCsvTransformer } from "./csv-transformer";

describe("SmartReadCsvTransformer", () => {
  const transformer = new SmartReadCsvTransformer();

  describe("parseQuantity", () => {
    // Note: parseQuantity is private, but we can test it through transformToLong
    // or by accessing it as any if we really need to.
    // Let's test it through validation results in transformToLong for a cleaner test.

    it("should accept valid quantities", () => {
      const wideData = [{ 納入量1: "1,000", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toHaveLength(0);
      expect(result.long_data[0]["納入量"]).toBe("1000");
    });

    it("should accept decimal quantities", () => {
      const wideData = [{ 納入量1: "12.34", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toHaveLength(0);
      expect(result.long_data[0]["納入量"]).toBe("12.34");
    });

    it("should error on negative quantities", () => {
      const wideData = [{ 納入量1: "-10", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "納入量(明細1)",
          message: "納入量は0以上の数値である必要があります",
          value: "-10",
        }),
      );
    });

    it("should error on non-numeric strings", () => {
      const wideData = [{ 納入量1: "abc", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "納入量(明細1)",
          message: "納入量は0以上の数値である必要があります",
          value: "abc",
        }),
      );
    });

    it("should error on mixed alphanumeric strings (like '12abc')", () => {
      const wideData = [{ 納入量1: "12abc", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "納入量(明細1)",
          message: "納入量は0以上の数値である必要があります",
          value: "12abc",
        }),
      );
    });

    it("should error on Japanese numbers (full-width)", () => {
      // normalizeValue should convert these, so they should actually BE valid
      const wideData = [{ 納入量1: "１２３", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toHaveLength(0);
      expect(result.long_data[0]["納入量"]).toBe("123");
    });
  });

  describe("validateCommonFields - parseDate", () => {
    it("should handle various date formats", () => {
      const dates = ["2024/01/20", "2024-01-21", "2024年01月22日", "2024.01.23"];
      for (const date of dates) {
        const wideData = [{ 発行日: date, 納入量1: "100", 材質コード1: "ABC" }];
        const result = transformer.transformToLong(wideData);
        expect(result.errors).toHaveLength(0);
      }
    });

    it("should error on invalid dates", () => {
      const wideData = [{ 発行日: "invalid-date", 納入量1: "100", 材質コード1: "ABC" }];
      const result = transformer.transformToLong(wideData);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "発行日",
          message: "日付形式が不正です",
        }),
      );
    });
  });
});
