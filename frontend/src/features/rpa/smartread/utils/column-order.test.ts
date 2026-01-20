/**
 * Tests for column ordering utility
 */

import { describe, expect, it } from "vitest";

import { sortColumnHeaders } from "./column-order";

describe("sortColumnHeaders", () => {
  it("should sort common fields in definition order", () => {
    const headers = ["納品書No", "ファイル名", "発行日", "ページ番号"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual(["ファイル名", "ページ番号", "発行日", "納品書No"]);
  });

  it("should place long data fields after common fields", () => {
    const headers = ["明細番号", "ファイル名", "納品書No"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual(["ファイル名", "納品書No", "明細番号"]);
  });

  it("should sort numbered detail fields correctly", () => {
    const headers = ["材質コード3", "材質コード1", "材質コード2", "材質サイズ1", "材質サイズ2"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual([
      "材質コード1",
      "材質コード2",
      "材質コード3",
      "材質サイズ1",
      "材質サイズ2",
    ]);
  });

  it("should sort sub-detail fields with double numbers correctly", () => {
    const headers = ["Lot No1-2", "Lot No1-1", "Lot No2-1", "梱包数1-1"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual(["Lot No1-1", "Lot No1-2", "Lot No2-1", "梱包数1-1"]);
  });

  it("should follow full category order: common → long → detail → sub_detail → unknown", () => {
    const headers = [
      "未知フィールド",
      "Lot No1-1",
      "材質コード1",
      "明細番号",
      "ファイル名",
      "納入量2",
      "梱包数1-2",
    ];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual([
      "ファイル名", // common
      "明細番号", // long
      "材質コード1", // detail
      "納入量2", // detail
      "Lot No1-1", // sub_detail
      "梱包数1-2", // sub_detail
      "未知フィールド", // unknown
    ]);
  });

  it("should handle empty array", () => {
    const headers: string[] = [];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual([]);
  });

  it("should sort unknown fields alphabetically", () => {
    const headers = ["カスタム項目Z", "カスタム項目A", "カスタム項目M"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual(["カスタム項目A", "カスタム項目M", "カスタム項目Z"]);
  });

  it("should handle mixed common and numbered detail fields", () => {
    const headers = ["材質コード5", "ファイル名", "材質コード1", "ページ番号", "単位2", "単位1"];
    const sorted = sortColumnHeaders(headers);
    expect(sorted).toEqual([
      "ファイル名", // common
      "ページ番号", // common
      "材質コード1", // detail
      "材質コード5", // detail
      "単位1", // detail
      "単位2", // detail
    ]);
  });

  it("should preserve original array (immutable)", () => {
    const headers = ["B", "A", "C"];
    const original = [...headers];
    sortColumnHeaders(headers);
    expect(headers).toEqual(original);
  });
});
