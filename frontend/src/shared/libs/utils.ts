/**
 * 【設計意図】共通ユーティリティ関数の設計判断:
 *
 * 1. cn() 関数（Tailwind クラス結合）
 *    理由: Tailwind CSS の条件付きクラス適用を簡潔に記述
 *    構成:
 *    - clsx: 条件付きクラス名の生成（falsy値を除外）
 *    - twMerge: Tailwind の競合クラスを自動マージ
 *    例:
 *    cn("p-4", isActive && "bg-blue-500", "text-white")
 *    → isActive=true: "p-4 bg-blue-500 text-white"
 *    → isActive=false: "p-4 text-white"
 *
 *    twMerge の役割:
 *    cn("p-4", "p-6") → "p-6"（後勝ち）
 *    → p-4とp-6が競合するため、p-6のみが適用される
 *    メリット: 条件によってスタイルを上書きしやすい
 *
 * 2. formatCodeAndName() 関数
 *    理由: コードと名称を見やすく結合表示
 *    用途:
 *    - 製品: "P-001 ブレーキパッド"
 *    - 得意先: "C-100 トヨタ自動車"
 *    - 納入先: "D-050 名古屋工場"
 *
 *    trim() の使用:
 *    - 理由: データベースに空白が混入している可能性
 *    - 例: "P-001 " + "ブレーキパッド" → "P-001  ブレーキパッド"（空白重複）
 *    → trim()で正規化し、正確な表示
 *
 *    段階的フォールバック:
 *    1. code + name 両方あり → 結合して返す
 *    2. code のみ → code を返す
 *    3. name のみ → name を返す
 *    4. 両方なし → "" を返す
 *    理由: どの組み合わせでも安全に表示可能
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCodeAndName(
  code?: string | null,
  name?: string | null,
  options?: { separator?: string },
) {
  const separator = options?.separator ?? " ";
  const trimmedCode = code?.trim();
  const trimmedName = name?.trim();

  if (trimmedCode && trimmedName) {
    return `${trimmedCode}${separator}${trimmedName}`;
  }

  if (trimmedCode) return trimmedCode;
  if (trimmedName) return trimmedName;
  return "";
}
