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

  describe("isEmptyDetail - Lot No and 梱包数 handling", () => {
    it("should NOT skip detail when Lot No/梱包数 are empty but other fields have values", () => {
      const wideData = [
        {
          ファイル名: "test.pdf",
          材質コード1: "MAT001",
          納入量1: "100",
          // Lot No1-1, Lot No1-2, 梱包数1-1, 梱包数1-2 are all empty
        },
      ];
      const result = transformer.transformToLong(wideData);

      console.log("[TEST] Result:", JSON.stringify(result, null, 2));
      expect(result.long_data).toHaveLength(1);
      expect(result.long_data[0]["材質コード"]).toBe("MAT001");
      expect(result.long_data[0]["納入量"]).toBe("100");
    });

    it("should skip detail when ALL fields including Lot No/梱包数 are empty", () => {
      const wideData = [
        {
          ファイル名: "test.pdf",
          // 材質コード1, 納入量1, Lot No1-1, etc all empty
        },
      ];
      const result = transformer.transformToLong(wideData);

      expect(result.long_data).toHaveLength(0);
    });

    it("should NOT skip detail when only Lot No has value", () => {
      const wideData = [
        {
          ファイル名: "test.pdf",
          "Lot No1-1": "LOT001",
          // Other fields empty
        },
      ];
      const result = transformer.transformToLong(wideData);

      console.log("[TEST] Lot No only - Result:", JSON.stringify(result, null, 2));
      expect(result.long_data).toHaveLength(1);
      expect(result.long_data[0]["Lot No1"]).toBe("LOT001");
    });

    it("should NOT skip detail when only 梱包数 has value", () => {
      const wideData = [
        {
          ファイル名: "test.pdf",
          "梱包数1-1": "50",
          // Other fields empty
        },
      ];
      const result = transformer.transformToLong(wideData);

      console.log("[TEST] 梱包数 only - Result:", JSON.stringify(result, null, 2));
      expect(result.long_data).toHaveLength(1);
      expect(result.long_data[0]["梱包数1"]).toBe("50");
    });

    it("should handle full-width numbers in column names (材質コード１ with 全角1)", () => {
      const wideData = [
        {
          ファイル名: "test.pdf",
          材質コード１: "MAT001", // 全角の１
          納入量１: "100", // 全角の１
        },
      ];
      const result = transformer.transformToLong(wideData);

      expect(result.long_data).toHaveLength(1);
      expect(result.long_data[0]["材質コード"]).toBe("MAT001");
      expect(result.long_data[0]["納入量"]).toBe("100");
    });
  });
});
