# 現在のタスク一覧

**最終更新:** 2025-12-12

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## 🚧 残タスク（P1: 高優先度）

### P1-8: フォーキャスト画面改善 ✅

**ステータス:** 完了

**概要:**
フォーキャスト画面の以下の問題を解決:
- 計画引当サマリと関連受注の不整合（P1-8元タスク）
- フォーキャスト編集後の画面更新問題（P2-2統合）

**完了済み対応:**
- ✅ 関連受注を仮受注（FORECAST_LINKED）のみにフィルタリング
- ✅ 完了済み受注（status=closed）を除外
- ✅ 関連受注セクションを折りたたみ式サマリ表示に変更
- ✅ 「受注管理で開く」リンクを追加
- ✅ フォーキャスト編集時に計画引当を自動再計算
- ✅ 計画引当サマリでの在庫不足（赤字）表示対応

---

### P1-9: フロントエンドテスト拡充 ✅

**ステータス:** 完了（目標達成！）

**概要:**
フロントエンドのテストカバレッジが非常に低い状態（479コンポーネントに対して7テストファイルのみ）。
主要機能のテストを追加してコード品質を向上させる。

**最終結果:**
- テストファイル: **20件** (7 → 20, +13) 🎉
- テスト数: **298 passed**, 1 skipped (299 total)

**追加済みテスト:**
- ✅ `useLotFilters.test.ts` - ロットフィルタリング (16テスト)
- ✅ `useOrderLineComputed.test.ts` - 受注明細計算 (24テスト)
- ✅ `allocationCalculations.test.ts` - 引当計算ユーティリティ (35テスト)
- ✅ `formatQuantity.test.ts` - 数量フォーマット (28テスト)
- ✅ `number.test.ts` - 数値フォーマット (21テスト)
- ✅ `status.test.ts` - ステータス判定 (23テスト)
- ✅ `shared/libs/utils/date.test.ts` - 日付ユーティリティ (19テスト)
- ✅ `shared/utils/date.test.ts` - 日付フォーマット (16テスト)
- ✅ `order.test.ts` - 受注コードフォーマット (14テスト)
- ✅ `allocations.test.ts` - 引当ロットデータ変換 (15テスト)
- ✅ `date-utils.test.ts` - Forecast日付ユーティリティ (17テスト)
- ✅ `aggregation-utils.test.ts` - Forecast集計ユーティリティ (14テスト)
- ✅ `utils.test.ts` - 共通ライブラリ (11テスト)

**完了項目:**
- [x] `orders/` - 受注関連のテスト拡充
- [x] `allocations/` - 引当関連のテスト拡充
- [x] `inventory/` - 在庫関連のテスト拡充
- [x] `shared/utils/` - 共通ユーティリティのテスト
- [x] `shared/libs/` - 共通ライブラリのテスト
- [x] `forecasts/` - 予測関連のテスト

**目標達成:**
- ~~テストファイル数: 7 → 20以上~~ ✅ 達成！(20ファイル)


## 📌 将来対応（P2: 中優先度）

---

### P2-3: SAP在庫同期 - 本番API接続待ち

**現状**: モック実装完了、UI実装完了

**残タスク**（本番SAP接続が必要）:
- ❌ 本番SAP API接続
- ❌ 定期実行設定（オプション）

---

## 📌 将来対応（P3: 低優先度）

### P3-1: SAP受注登録の本番化

**現状:** モック実装済み、本番SAP API接続待ち

---

### P3-2: eslint-disable コメント削除 🆕

**ステータス:** 未着手

**概要:**
31ファイルで `// eslint-disable` が使用されている。適切なコード修正に置き換える。

### P2-3: フォーキャスト詳細：他グループ引当の表示 🆕

**ステータス:** 未着手

**概要:**
計画引当サマリにおいて、同じロットが他のフォーキャストグループ（別顧客・別納入先）で引当されている場合、その消費量が分からないため、内訳を表示する。

**対応予定:**
- `PlanningAllocationSummary` APIに他グループ引当数量（`other_allocated_quantity`）を追加
- UIのロット内訳に「他グループ引当」列またはツールチップを追加

**影響ファイル例:**
- `SearchableSelect.tsx`
- `BatchJobsPage.tsx`
- `ProductMappingsListPage.tsx`
- その他28ファイル

---

### P3-3: DDLスキーマ同期 ✅

**ステータス:** 完了（2025-12-12）

**概要:**
`schema_latest.sql` と SQLAlchemy モデル間で `allocations.lot_id` vs `lot_reference` の差異があった。
→ **意図的な設計変更**（ビジネスキー参照への移行）であることを確認し、DDLを再ダンプして同期完了。

**対応内容:**
- `schema_latest.sql` を本番DBから再ダンプ
- ファイル先頭に「自動生成ファイル」のコメントを追加
- 更新コマンドをドキュメント化

**参照ドキュメント:**
- [`docs/architecture/decoupling-migration-plan.md`](../architecture/decoupling-migration-plan.md) - 疎結合化計画


---

## 📊 コード品質

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors** | 0 | ✅ Clean |
| **Ruff Errors** | 0 | ✅ Clean |
| **Backend Tests** | 321 passed | ✅ Clean |

---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
