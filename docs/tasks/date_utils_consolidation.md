# 日付ユーティリティ統合タスク

## ステータス

- **開始日**: 2026-01-09
- **担当**: Claude
- **優先度**: 中
- **進捗**: 🔵 未着手

---

## 📋 タスク概要

分散している日付ユーティリティ関数を`shared/utils/date.ts`に統合し、プロジェクト全体で統一された日付処理を実現する。

### 背景

現在、日付関連のユーティリティ関数が複数箇所に分散している：

1. **`/shared/utils/date.ts`** - フォーマット専用（formatDate, formatDateTime, formatDateForInput）
2. **`/shared/libs/utils/date.ts`** - （重複？）
3. **`/features/forecasts/.../date-utils.ts`** - 日付計算専用（getDatesForMonth, isSameDay, etc.）

この分散により以下の問題が発生：

- インポート元の混乱（どれを使うべきか不明瞭）
- 機能の重複実装の可能性
- 保守性の低下
- 新規開発者のオンボーディング困難

### 目的

- 日付ユーティリティを単一ファイルに統合
- 明確な責務分離（フォーマット vs 計算）
- インポートパスの統一
- ドキュメント整備

---

## 🔍 現状分析

### 既存の日付ユーティリティファイル

| ファイル | 場所 | 機能 | 行数（推定） |
|---------|------|------|------------|
| **date.ts** | `/shared/utils/` | 日付フォーマット専用 | ~106行 |
| **date.ts** | `/shared/libs/utils/` | （内容確認が必要） | ? |
| **date-utils.ts** | `/features/forecasts/.../` | 日付計算専用 | ~70行 |

### shared/utils/date.ts の関数

```typescript
// 📄 フォーマット関数（表示用）
formatDate(date, options)         // "yyyy/MM/dd"
formatDateTime(date)               // "yyyy/MM/dd HH:mm"
formatDateForInput(date)           // "yyyy-MM-dd" (HTML input用)
```

**特徴:**
- date-fns の `format()`, `parseISO()` を使用
- エラーハンドリング完備（try-catch）
- fallback オプションあり
- 詳細なドキュメントコメント

### forecasts/date-utils.ts の関数

```typescript
// 📅 日付計算関数
getDatesForMonth(targetMonth)                  // 月内の全日付
getDatesForNextMonthFirst10Days(targetMonth)   // 翌月1-10日
formatDateKey(date)                            // "YYYY-MM-DD" (キー用)
isSameDay(date1, date2)                        // 日付一致判定
isPastDate(date)                               // 過去日判定
isToday(date)                                  // 今日判定
isFutureDate(date)                             // 未来日判定
```

**特徴:**
- 純粋な計算ロジック（外部ライブラリなし）
- forecast 機能特化（月次データ処理）
- 汎用的に使える関数も含む

### shared/libs/utils/date.ts の確認

（このファイルの内容を確認して重複を精査する必要あり）

---

## 💡 改善案

### 1. 統合先: `/shared/utils/date.ts`

単一の日付ユーティリティファイルに全機能を集約：

```
/shared/utils/date.ts
├── フォーマット関数（表示用）
│   ├── formatDate()
│   ├── formatDateTime()
│   └── formatDateForInput()
│
├── 日付計算関数（ビジネスロジック用）
│   ├── getDatesForMonth()
│   ├── getDatesForNextMonthFirst10Days()
│   ├── isSameDay()
│   ├── isPastDate()
│   ├── isToday()
│   └── isFutureDate()
│
└── ユーティリティ関数
    ├── parseDate()         // 安全なパース
    ├── isValidDate()       // バリデーション
    └── getDateRange()      // 範囲生成
```

### 2. ファイル構成

```typescript
/**
 * 日付ユーティリティ
 *
 * このファイルはプロジェクト全体で使用する日付関連のユーティリティ関数を提供します。
 *
 * @module shared/utils/date
 */

import { format, parseISO, isBefore, isAfter, isSameDay as dateFnsIsSameDay } from "date-fns";

// ========================================
// Section 1: フォーマット関数（表示用）
// ========================================

export function formatDate(date, options) { /* 既存 */ }
export function formatDateTime(date) { /* 既存 */ }
export function formatDateForInput(date) { /* 既存 */ }

// ========================================
// Section 2: 日付計算関数
// ========================================

export function getDatesForMonth(targetMonth: Date): Date[] { /* forecasts から移行 */ }
export function getDatesForNextMonthFirst10Days(targetMonth: Date): Date[] { /* forecasts から移行 */ }
export function isSameDay(date1: Date, date2: Date): boolean { /* forecasts から移行 */ }
export function isPastDate(date: Date): boolean { /* forecasts から移行 */ }
export function isToday(date: Date): boolean { /* forecasts から移行 */ }
export function isFutureDate(date: Date): boolean { /* forecasts から移行 */ }

// ========================================
// Section 3: ユーティリティ関数（新規）
// ========================================

/**
 * 安全に日付をパース
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

/**
 * 有効な日付かチェック
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 日付範囲を生成
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
```

### 3. インポート統一

**Before:**
```typescript
// 混在状態
import { formatDate } from "@/shared/utils/date";
import { getDatesForMonth } from "@/features/forecasts/.../date-utils";
```

**After:**
```typescript
// 統一
import { formatDate, getDatesForMonth, isSameDay } from "@/shared/utils/date";
```

---

## 🎯 実装計画

### Phase 1: 調査・マッピング（0.5日目）

- [ ] `shared/libs/utils/date.ts` の内容確認
  - [ ] 重複関数の特定
  - [ ] 削除可否の判断

- [ ] 全プロジェクトでの使用箇所調査

```bash
# 使用箇所の検索
grep -r "import.*from.*date" frontend/src/ | grep -v node_modules
grep -r "getDatesForMonth\|isSameDay\|isPastDate" frontend/src/
```

- [ ] 関数使用頻度のマッピング

### Phase 2: 統合実装（0.5日目）

- [ ] `shared/utils/date.ts` に関数を追加
  - [ ] forecasts/date-utils.ts から関数をコピー
  - [ ] ドキュメントコメント追加
  - [ ] 型定義の厳格化

- [ ] テストコードの統合
  - [ ] 既存テストを `shared/utils/date.test.ts` に統合
  - [ ] 新規関数のテスト追加

### Phase 3: マイグレーション（0.5日目）

- [ ] インポートパスの一括置換

```bash
# forecast feature のインポート置換
find frontend/src/features/forecasts -type f -name "*.tsx" -o -name "*.ts" \
  -exec sed -i 's|from.*date-utils|from "@/shared/utils/date"|g' {} \;
```

- [ ] 段階的な移行
  1. forecast feature から移行
  2. 他のfeatureでの使用確認
  3. 問題なければ旧ファイル削除

### Phase 4: クリーンアップ（0.5日目）

- [ ] 旧ファイルの削除
  - [ ] `features/forecasts/.../date-utils.ts`
  - [ ] `shared/libs/utils/date.ts`（重複確認後）

- [ ] 関連テストファイルの削除

- [ ] ドキュメント更新
  - [ ] CLAUDE.md に日付ユーティリティの使い方追記
  - [ ] JSDocの整備

---

## 📝 実装の詳細仕様

### 完成後の shared/utils/date.ts

```typescript
/**
 * 日付ユーティリティ
 *
 * プロジェクト全体で使用する日付関連の関数を提供。
 * date-fnsライブラリをベースに、プロジェクト固有の要件に対応。
 *
 * @module shared/utils/date
 */

import {
  format,
  parseISO,
  isBefore,
  isAfter,
  isSameDay as dateFnsIsSameDay,
  isToday as dateFnsIsToday,
  startOfDay,
  endOfDay,
} from "date-fns";

// ========================================
// Section 1: 型定義
// ========================================

export type DateInput = string | Date | null | undefined;

export type FormatDateOptions = {
  format?: string;
  fallback?: string;
};

// ========================================
// Section 2: フォーマット関数（表示用）
// ========================================

/**
 * 日付を指定フォーマットで文字列化
 *
 * @param date - フォーマットする日付
 * @param optionsOrFormat - フォーマット文字列またはオプション
 * @returns フォーマット済み文字列
 *
 * @example
 * formatDate("2024-01-15") // "2024/01/15"
 * formatDate(new Date(), "yyyy-MM-dd") // "2024-01-15"
 * formatDate(null, { fallback: "-" }) // "-"
 */
export function formatDate(
  date: DateInput,
  optionsOrFormat: string | FormatDateOptions = "yyyy/MM/dd",
): string {
  const formatStr =
    typeof optionsOrFormat === "string"
      ? optionsOrFormat
      : (optionsOrFormat.format ?? "yyyy/MM/dd");
  const fallback = typeof optionsOrFormat === "object" ? (optionsOrFormat.fallback ?? "") : "";

  if (!date) return fallback;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn("Invalid date passed to formatDate:", date, error);
    return fallback;
  }
}

/**
 * 日付を日時フォーマット（YYYY/MM/DD HH:mm）で文字列化
 */
export function formatDateTime(date: DateInput): string {
  return formatDate(date, "yyyy/MM/dd HH:mm");
}

/**
 * 日付をHTML input[type="date"]用フォーマット（YYYY-MM-DD）で文字列化
 */
export function formatDateForInput(date: DateInput): string {
  return formatDate(date, "yyyy-MM-dd");
}

// ========================================
// Section 3: 日付計算関数
// ========================================

/**
 * 指定月の全日付を取得
 *
 * @param targetMonth - 対象月（月内のいずれかの日付）
 * @returns 月内の全日付の配列
 *
 * @example
 * getDatesForMonth(new Date(2024, 0, 15)) // 2024年1月の全31日
 */
export function getDatesForMonth(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
}

/**
 * 翌月1日〜10日の日付を取得
 *
 * SAP予測データが翌月10日まで含むため、forecast機能で使用。
 *
 * @param targetMonth - 基準月
 * @returns 翌月1-10日の日付配列
 */
export function getDatesForNextMonthFirst10Days(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const nextMonthStart = new Date(year, month + 1, 1);

  return Array.from(
    { length: 10 },
    (_, index) => new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), index + 1),
  );
}

/**
 * 2つの日付が同じ日かチェック（時刻無視）
 *
 * @param date1 - 比較対象1
 * @param date2 - 比較対象2
 * @returns 同じ日ならtrue
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dateFnsIsSameDay(date1, date2);
}

/**
 * 過去の日付かチェック
 *
 * @param date - チェック対象の日付
 * @returns 過去日ならtrue
 */
export function isPastDate(date: Date): boolean {
  return isBefore(startOfDay(date), startOfDay(new Date()));
}

/**
 * 今日かチェック
 *
 * @param date - チェック対象の日付
 * @returns 今日ならtrue
 */
export function isToday(date: Date): boolean {
  return dateFnsIsToday(date);
}

/**
 * 未来の日付かチェック
 *
 * @param date - チェック対象の日付
 * @returns 未来日ならtrue
 */
export function isFutureDate(date: Date): boolean {
  return isAfter(startOfDay(date), startOfDay(new Date()));
}

/**
 * 日付をYYYY-MM-DD形式でフォーマット（マップキー用）
 *
 * @param date - フォーマット対象
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ========================================
// Section 4: ユーティリティ関数
// ========================================

/**
 * 安全に日付をパース
 *
 * @param value - パース対象
 * @returns Date オブジェクトまたは null
 */
export function parseDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

/**
 * 有効な日付かチェック
 *
 * @param date - チェック対象
 * @returns 有効な Date オブジェクトなら true
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 日付範囲を生成
 *
 * @param startDate - 開始日
 * @param endDate - 終了日
 * @returns 開始日から終了日までの全日付配列
 *
 * @example
 * getDateRange(new Date(2024, 0, 1), new Date(2024, 0, 5))
 * // [2024-01-01, 2024-01-02, 2024-01-03, 2024-01-04, 2024-01-05]
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
```

---

## ✅ 完了条件

- [ ] 全ての日付関数が `shared/utils/date.ts` に統合
- [ ] 旧ファイル削除済み（date-utils.ts等）
- [ ] 全インポートパスが統一
- [ ] テストが全て成功（カバレッジ80%以上）
- [ ] JSDocドキュメント完備
- [ ] CLAUDE.md に使用ガイドライン追記

---

## 📊 効果測定

### 定量的効果

- **ファイル数削減**: 3ファイル → 1ファイル (-2)
- **インポート文の簡潔化**:
  - Before: 2行（別々のインポート）
  - After: 1行（統合インポート）

### 定性的効果

- インポート元の迷いがなくなる
- 日付処理の統一性向上
- 新規開発者のオンボーディング簡略化
- 関数発見性の向上（1ファイルで完結）

---

## 🔗 関連タスク

- フィルター標準化タスク（進行中）
- 削除ダイアログDRY化タスク（ドキュメント作成済み）

---

## 📅 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-01-09 | ドキュメント作成 | Claude |
| | | |

---

## 💬 備考・補足

### マイグレーション時の注意点

1. **forecasts feature への影響**
   - date-utils.ts を直接使用している箇所を特定
   - 段階的に置換して動作確認

2. **テストコード**
   - forecasts/date-utils.test.ts のテストを shared/utils/date.test.ts にマージ
   - 全テスト成功を確認してから旧ファイル削除

3. **型安全性**
   - DateInput 型で統一
   - null/undefined の扱いを明確化

### 将来的な拡張

- タイムゾーン対応（date-fns-tz 導入）
- ロケール対応（日本語以外）
- 相対日付表示（"3日前", "明日" など）
