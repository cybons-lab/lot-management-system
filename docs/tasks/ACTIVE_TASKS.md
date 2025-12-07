# 現在のタスク一覧

**最終更新:** 2025-12-07

> このドキュメントは**現在進行中および未着手のタスク**を管理します。
> 完了したタスクは `CHANGELOG.md` に記録され、このファイルから削除されます。

---

## 🎯 残タスク（今すぐ対応が必要）

### なし

現在、緊急対応が必要なタスクはありません。

---

## 🔜 近い将来対応予定

### ✅ P2-1: SAP在庫同期機能の完成（モック環境対応完了）

**ページ:** `/admin/batch-jobs` (実装完了)

**実装完了:**
- ✅ `InventorySyncService`: SAP在庫とローカルDB在庫の差異チェック（モック対応）
- ✅ `/api/batch-jobs/inventory-sync/execute`: 手動実行API
- ✅ `/api/batch-jobs/inventory-sync/alerts`: 差異アラート取得API
- ✅ `BatchJobsPage`: SAP在庫同期専用UI
  - ワンクリック実行ボタン
  - 差異アラート一覧表示（商品ID、ローカル/SAP在庫、差異率、最終チェック日時）
  - アクティブアラート/全履歴切り替え
- ✅ `BatchJobsPage`: 汎用バッチジョブ管理UI（ジョブ一覧・実行・削除）

**残タスク（本番SAP接続が必要）:**
- ❌ **本番SAP API接続**（現在はモック: `SAPMockClient`）
  - `backend/app/external/sap_mock_client.py` を実際のSAP APIクライアントに置き換え
- ❌ **定期実行設定**（オプション）
  - APScheduler または Celery Beat による自動スケジュール実行
  - 実行頻度設定UI

> **Note**: モック環境で実装可能な部分は全て完了。本番SAP環境が準備できたら残タスクに着手。


---

## 📌 将来対応（P3: 低優先度）

### 1. SAP受注登録の本番化

**現状:**
- ✅ SAP受注登録: モック実装済み
- ❌ 本番SAP API接続: 未実装

**関連TODO:**
- `backend/app/services/sap/sap_service.py:L61`

---

## 🔧 技術的負債（コード品質無視コメント）

> **重要:** コード品質を「通す」ためだけの無視コメントは技術的負債です。

### 📊 総合サマリー（合計138件 / 当初163件から25件削減）

| ツール | 無視コメント | 件数 | 削減目標 | 状態 |
|-------|------------|------|---------|------|
| Backend: Mypy | `# type: ignore` | 63 | 0 | 🔴 要対応 |
| Backend: Ruff | `# noqa` | 53 | 36 (17件削減) | 🟡 一部許容可 |
| Frontend: TypeScript | `@ts-ignore` | 0 | 0 | ✅ Clean |
| Frontend: ESLint | `eslint-disable` | 22 | 22 (達成!) | ✅ 許容可 |

**削減目標:** **138件 → 58件**（残り80件削減必要）

---

### 🔴 Backend: Mypy `# type: ignore` (63件) - 要対応

#### エラータイプ別内訳

| エラータイプ | 件数 | 優先度 | 状態 |
|-------------|------|--------|------|
| ~~[no-type-specified]~~ | ~~5~~ →0 | ✅ | **完了** |
| ~~[import-untyped]~~ | ~~6~~ →0 | ✅ | **完了**（stubs追加） |
| `[arg-type]` | 21 | 🔴 高 | 9件削減（Enum変換）、残21件 |
| `[attr-defined]` | 14 | 🔴 高 | 4件削減（_temp_allocated廃止） |
| `[assignment]` | 8 | 🟡 中 | 未着手 |
| `[override]` | 6 | 🟡 中 | 未着手 |
| `[union-attr]` | 5 | 🟡 中 | 未着手 |
| その他 | 9 | 🟡 中 | 未着手 |

#### ✅ 完了した修正

1. **`[no-type-specified]` 5件→0件** - エラータイプ明確化
2. **`[import-untyped]` 6件→0件** - stubsインストール（dateutil, pandas, openpyxl）
3. **Enum変換 9件削除** - AdjustmentType, InboundPlanStatus明示変換
4. **SupplierService PK型 2件** - ジェネリック型str→int、Noneガード
5. **`_temp_allocated`廃止 4件** - dict方式に置換

---

### 🟡 Backend: Ruff `# noqa` (53件) - 一部許容可

| コード | 説明 | 件数 | 対応 |
|-------|------|------|------|
| **F403** | `import *` in `__init__.py` | 36 | ✅ 許容（パッケージ公開API） |
| **E402** | Import not at top | 8 | 🟡 テスト・スクリプトのみ許容 |
| **F401** | Unused import | 5 | 🟡 側面効果importで許容 |
| ~~E712~~ | ~~`== True` comparison~~ | ~~5~~ →1 | ✅ 4件修正済み（残1はインデックス定義で許容） |
| その他 | - | 3 | 🟡 確認要 |

#### ✅ 完了: E712 (5件→1件、4件修正)

**E712 (5件):** 冗長な`== True`比較
```python
# 修正前
.filter(Product.is_primary == True)  # noqa: E712

# 修正後
.filter(Product.is_primary)
```

**F401 (5件):** 未使用インポート → 削除

---

### 🟢 Frontend: ESLint `eslint-disable` (23件) - 許容可

| ルール | 件数 | 対応 |
|-------|------|------|
| `max-lines-per-function` | 18 | ✅ 許容（コメント付き、分割困難） |
| `complexity` | 3 | ✅ 許容（サブコンポーネント分離済み） |
| `jsx-a11y/label-has-associated-control` | 1 | ❌ **修正すべき** |

#### 維持対象（許容可） - 22件

以下は分割すると可読性が低下するため維持：
- **複合フック**: `useOrderLineAllocation.ts` - 引当関連の状態と処理を一箇所にまとめた複合フック
- **テーブル列定義**: `OrderInfoColumns.tsx` など
- **ページコンポーネント**: `UsersListPage.tsx`, `BatchJobsPage.tsx` など

#### ❌ 要対応: jsx-a11y (1件)

アクセシビリティ問題:
- `features/orders/components/OrdersFilters.tsx:57`

---

### ✅ Frontend: TypeScript (0件) - Clean

`@ts-ignore`や`@ts-expect-error`は一切使用されていません。**完璧！** 🎉

### 🐛 既知の不具合 (Known Issues)

#### Backend Test Failures (40 errors)
`backend/tests/api/test_order_allocation_refactor.py` などで既存のテストエラーが発生しています。
これらは今回のBulk Importリファクタリングとは関連しないレガシーな問題ですが、将来的に解消が必要です。
- `TestOrderAPI`: create/duplicate/cancel 関連のエラー
- `TestAllocationPreviewStatus`: ステータス遷移テストのエラー

---

## 📊 コード品質サマリー

### ツール実行結果

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors (通常設定)** | 0 | ✅ Clean |
| **Ruff Errors** | 0 | ✅ Clean |

### コード品質無視コメント（技術的負債）

| 種類 | 件数 | 削減目標 | 状態 |
|------|------|---------|------|
| **Mypy `# type: ignore`** | 83 | 0 | 🔴 要対応 |
| **Ruff `# noqa`** | 57 | 36 | 🟡 一部許容 |
| **ESLint `eslint-disable`** | 23 | 22 | 🟢 許容可 |
| **TypeScript `@ts-ignore`** | 0 | 0 | ✅ Clean |
| **合計** | **163** | **58** | **🔴 105件削減必要** |

### その他

| 種類 | 件数 | 状態 |
|------|------|------|
| **TODO** | 5 | 🟡 Backend待ち/将来対応 |
| **Backend Test Failures** | 40 | 🟡 レガシー問題 |

---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
