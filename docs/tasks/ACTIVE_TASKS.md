# 現在のタスク一覧

**最終更新:** 2025-12-12

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## 🚧 残タスク（P1: 高優先度）

### P1-8: 自動引当数量不整合調査 (199 vs 245)

**ステータス:** 一時停止 (ユーザー指示によりPD)

**概要:**
自動引当実行後、計画引当サマリには「245」と表示されるが、関連受注一覧の合計（199）と一致しない現象。
バックエンド調査用スクリプトではDB上に全データが存在することを確認済みだが、画面表示または集計ロジックに不整合が残っている可能性がある。

**完了済み対応:**
- ✅ 自動引当APIの実装 (`POST /bulk-auto-allocate`)
- ✅ フロントエンドでの引当数初期表示バグ修正
- ✅ 関連受注セクションのUIレイアウト修正

**残調査:**
- なぜサマリ(245)と明細合計(199)がズレるのか（Ghost Orderの可能性、またはフィルタリング条件の差異）

---

### P1-9: フロントエンドテスト拡充 🔄

**ステータス:** 進行中

**概要:**
フロントエンドのテストカバレッジが非常に低い状態（479コンポーネントに対して7テストファイルのみ）。
主要機能のテストを追加してコード品質を向上させる。

**現状:**
- テストファイル: 17件 (7 → 17, +10)
- テスト数: 247 passed, 1 skipped (248 total)

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

**追加すべきテスト（優先順）:**
- [x] `orders/` - 受注関連のテスト拡充
- [x] `allocations/` - 引当関連のテスト拡充
- [x] `inventory/` - 在庫関連のテスト拡充
- [x] `shared/utils/` - 共通ユーティリティのテスト
- [x] `shared/libs/` - 共通ライブラリのテスト
- [ ] `forecasts/` - 予測関連のテスト

**目標:**
- 主要featureに最低3テストファイルずつ追加
- テストファイル数: 7 → 20以上 (現在: 17、目標まであと3ファイル)


## 📌 将来対応（P2: 中優先度）

### P2-2: フォーキャスト編集後の画面更新問題

**ステータス:** 保留（優先度: 低）

手動リフレッシュで回避可能。バックエンド調査が必要な可能性あり。

詳細: [`docs/tasks/forecast-update-issue.md`](forecast-update-issue.md)

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
