/**
 * Column ordering utility for SmartRead CSV tables
 * Matches field definitions from backend's csv_transformer.py
 */

// 共通項目（固定）
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

// 明細項目（番号付き、例: 材質コード1, 材質コード2）
const DETAIL_FIELDS = ["材質コード", "材質サイズ", "単位", "納入量", "アイテム", "購買", "次区"];

// サブ明細項目（例: Lot No1-1, Lot No1-2）
const SUB_DETAIL_FIELDS = ["Lot No", "梱包数"];

// 縦持ちデータ専用フィールド
const LONG_DATA_FIELDS = ["明細番号"];

/**
 * フィールド名から番号を抽出
 * 例: "材質コード1" → { base: "材質コード", numbers: [1] }
 * 例: "Lot No1-2" → { base: "Lot No", numbers: [1, 2] }
 */
function parseFieldName(field: string): { base: string; numbers: number[] } {
  // パターン1: "Lot No1-2" のような複数番号（より具体的なパターンを先にチェック）
  const multiMatch = field.match(/^(.+?)(\d+)-(\d+)$/);
  if (multiMatch) {
    return {
      base: multiMatch[1],
      numbers: [parseInt(multiMatch[2], 10), parseInt(multiMatch[3], 10)],
    };
  }

  // パターン2: "材質コード1" のような単一番号
  const singleMatch = field.match(/^(.+?)(\d+)$/);
  if (singleMatch) {
    return {
      base: singleMatch[1],
      numbers: [parseInt(singleMatch[2], 10)],
    };
  }

  return { base: field, numbers: [] };
}

/**
 * フィールドのカテゴリとソート優先度を判定
 */
function getFieldCategory(field: string): {
  category: "common" | "long" | "detail" | "sub_detail" | "unknown";
  priority: number;
  baseIndex: number;
  numbers: number[];
} {
  const { base, numbers } = parseFieldName(field);

  // 共通フィールド
  const commonIndex = COMMON_FIELDS.indexOf(field);
  if (commonIndex >= 0) {
    return { category: "common", priority: 0, baseIndex: commonIndex, numbers: [] };
  }

  // 縦持ち専用フィールド
  const longIndex = LONG_DATA_FIELDS.indexOf(field);
  if (longIndex >= 0) {
    return { category: "long", priority: 1, baseIndex: longIndex, numbers: [] };
  }

  // 明細フィールド（番号付き）
  const detailIndex = DETAIL_FIELDS.indexOf(base);
  if (detailIndex >= 0) {
    return { category: "detail", priority: 2, baseIndex: detailIndex, numbers };
  }

  // サブ明細フィールド（番号付き）
  const subDetailIndex = SUB_DETAIL_FIELDS.indexOf(base);
  if (subDetailIndex >= 0) {
    return { category: "sub_detail", priority: 3, baseIndex: subDetailIndex, numbers };
  }

  // 未知のフィールド（最後に追加）
  return { category: "unknown", priority: 4, baseIndex: 0, numbers };
}

/**
 * 複数の番号を比較（辞書順）
 */
function compareNumbers(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

/**
 * カラムヘッダーを定義順にソート
 *
 * ソート順:
 * 1. 共通フィールド（COMMON_FIELDS の順序）
 * 2. 縦持ち専用フィールド（明細番号）
 * 3. 明細フィールド（DETAIL_FIELDS の順序、番号順）
 * 4. サブ明細フィールド（SUB_DETAIL_FIELDS の順序、番号順）
 * 5. 未知のフィールド（アルファベット順）
 */
export function sortColumnHeaders(headers: string[]): string[] {
  return [...headers].sort((a, b) => {
    const catA = getFieldCategory(a);
    const catB = getFieldCategory(b);

    // カテゴリ優先度で比較
    if (catA.priority !== catB.priority) {
      return catA.priority - catB.priority;
    }

    // 同カテゴリ内での比較
    if (catA.category === "common" || catA.category === "long") {
      // 共通フィールド・縦持ちフィールド: 定義順
      return catA.baseIndex - catB.baseIndex;
    }

    if (catA.category === "detail" || catA.category === "sub_detail") {
      // 明細・サブ明細: 基本フィールド順 → 番号順
      if (catA.baseIndex !== catB.baseIndex) {
        return catA.baseIndex - catB.baseIndex;
      }
      return compareNumbers(catA.numbers, catB.numbers);
    }

    // 未知のフィールド: アルファベット順
    return a.localeCompare(b);
  });
}
