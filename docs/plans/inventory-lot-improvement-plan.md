# 在庫・ロット管理改善 実行計画

**作成日**: 2026-01-16
**基準ドキュメント**: `docs/reviews/inventory-lot-management-review_merged.md`

---

## 概要

レビューで決定された6つの改善方針を、依存関係を考慮した4フェーズで実装する。

### 決定事項サマリ

| # | 問題 | 決定内容 |
|---|------|---------|
| 1 | `lot_number` の冗長性 | `LotReceipt.lot_number` カラムを完全削除 |
| 2 | `Lot` エイリアス | 廃止して `LotReceipt` に統一 |
| 3 | 残量計算の方式 | 動的計算を維持（現状維持） |
| 4 | `lot_master` 集計値の同期 | DBトリガーで自動更新 |
| 5 | 大量データ対応 | サーバーサイドページネーション + バーチャルスクロール |
| 6 | フロントエンド Decimal 処理 | `decimal.js` 導入 |

---

## 現在の進捗状況

### Phase 0: 品質基盤整備

| タスク | 状態 | 備考 |
|--------|------|------|
| Task 0.1: ロット簡易登録エラーの修正 | ✅ 完了 | API動作確認済み |
| Task 0.2: ロット作成ユニットテスト追加 | ✅ 完了 | 12テスト追加 |
| Task 0.3: API統合テスト追加 | ⬜ 未着手 | |
| Task 0.4: フロントエンドフォームテスト追加 | ⬜ 未着手 | |
| Task 0.5: 在庫計算精度テスト追加 | ⬜ 未着手 | |
| Task 0.6: E2Eテスト追加 | ⬜ 未着手 | |
| Task 0.7: CI/CDパイプライン強化 | ⬜ 未着手 | |

---

## Phase 0: 品質基盤整備（最優先）

> **目的**: リファクタリング前に品質を保証する仕組みを構築し、現在のエラーを解消する

### Task 0.1: ロット簡易登録エラーの修正 ✅

**状態**: 完了

**調査結果**:
1. `supplier_code` が `undefined` の場合、JSONでは省略され、バックエンドでは `None` として正しく処理される
2. `origin_type` は `sample`, `safety_stock`, `adhoc` のいずれかで動作確認済み
3. 同一 `lot_number` での複数 `LotReceipt` 作成は設計上許容（B-Plan アーキテクチャ）

---

### Task 0.2: ロット作成のユニットテスト追加 ✅

**状態**: 完了

**追加したテスト** (`backend/tests/services/test_lot_service.py`):

| テストケース | 状態 |
|------------|------|
| `test_create_lot_basic_adhoc` | ✅ |
| `test_create_lot_sample_type` | ✅ |
| `test_create_lot_safety_stock_type` | ✅ |
| `test_create_lot_with_supplier_code` | ✅ |
| `test_create_lot_without_supplier` | ✅ |
| `test_create_lot_invalid_supplier_code` | ✅ |
| `test_create_lot_invalid_product_id` | ✅ |
| `test_create_lot_invalid_warehouse_id` | ✅ |
| `test_create_lot_creates_lot_master` | ✅ |
| `test_create_lot_reuses_existing_lot_master` | ✅ |
| `test_create_lot_with_expiry_date` | ✅ |
| `test_create_lot_creates_stock_history` | ✅ |

**実行方法**:
```bash
docker compose exec -e TEST_DATABASE_URL="postgresql+psycopg2://testuser:testpass@host.docker.internal:5433/lot_management_test" backend pytest tests/services/test_lot_service.py::TestCreateLot -v
```

---

### Task 0.3: API 統合テストの追加

**依存関係**: Task 0.2 と並行可能

**作業内容**:
1. `POST /api/v2/lot/` のエンドポイントテスト追加
2. バリデーションエラー時のレスポンス確認
3. 正常系・異常系の網羅

**対象ファイル**:
- `backend/tests/api/v2/test_lot_api_v2.py`

**受け入れ条件**:
- [ ] ロット作成 API のテストが存在する
- [ ] 400/404/409 エラーのテストが存在する
- [ ] レスポンス形式の検証テストが存在する

---

### Task 0.4: フロントエンドフォームテストの追加

**依存関係**: Task 0.1 完了後

**作業内容**:
1. `AdhocLotCreateForm.tsx` のコンポーネントテスト追加
2. フォームバリデーションのテスト
3. API 送信データの形式確認テスト

**対象ファイル**:
- `frontend/src/features/inventory/components/AdhocLotCreateForm.test.tsx` (新規)

**受け入れ条件**:
- [ ] フォーム入力のバリデーションテストが存在する
- [ ] 送信データの型変換テストが存在する
- [ ] エラー表示のテストが存在する

---

### Task 0.5: 在庫計算精度テストの追加

**依存関係**: なし（独立して実施可能）

**作業内容**:
1. `allocated_quantity` + `locked_quantity` + `available_quantity` の整合性テスト
2. 複数ロット分割配分時の計算精度テスト
3. 予約（LotReservation）との整合性テスト

**対象ファイル**:
- `backend/tests/services/test_stock_calculation.py` (新規)

**受け入れ条件**:
- [ ] 在庫計算の整合性テストが存在する
- [ ] CONFIRMED vs ACTIVE の区別テストが存在する
- [ ] ロック数量の控除テストが存在する

---

### Task 0.6: E2E テストの追加（ロット管理フロー）

**依存関係**: Task 0.1-0.5 完了後

**作業内容**:
1. ロット簡易登録の E2E テスト追加
2. ロット一覧表示のテスト
3. ロック/アンロック操作のテスト

**対象ファイル**:
- `frontend/e2e/lot-management.spec.ts` (新規)

**受け入れ条件**:
- [ ] ロット作成フローの E2E テストが存在する
- [ ] ロット一覧表示の E2E テストが存在する
- [ ] エラーケースの E2E テストが存在する

---

### Task 0.7: CI/CD パイプラインの強化

**依存関係**: Task 0.2-0.6 完了後

**作業内容**:
1. GitHub Actions でテストカバレッジ計測を追加
2. カバレッジしきい値（80%）の設定
3. PR マージ前のテスト必須化

**対象ファイル**:
- `.github/workflows/ci.yml`

**受け入れ条件**:
- [ ] PR でテストカバレッジが表示される
- [ ] カバレッジ低下時に警告が出る
- [ ] テスト失敗時に PR がマージできない

---

## Phase 0 の依存関係図

```
Task 0.1: エラー修正 ✅
    ├── Task 0.2: ユニットテスト ✅
    │       └── Task 0.7: CI/CD 強化
    ├── Task 0.3: API 統合テスト ← 次のタスク
    │       └── Task 0.7: CI/CD 強化
    └── Task 0.4: フロントエンドテスト
            └── Task 0.6: E2E テスト
                    └── Task 0.7: CI/CD 強化

Task 0.5: 在庫計算テスト（独立）
        └── Task 0.7: CI/CD 強化
```

---

## Phase 1: DB変更（破壊的変更）

> **前提条件**: DBを空にするタイミングで実施

### Task 1.1: `LotReceipt.lot_number` カラム削除

**依存関係**: なし（最初に実施）

**作業内容**:
1. `LotReceipt.lot_number` を参照している箇所を洗い出し
2. すべての参照を `lot_master.lot_number` 経由に変更
3. マイグレーション作成（カラム削除）
4. ビュー定義の更新（`v_lot_details` 等）
5. インデックス `idx_lot_receipts_number` の削除

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- `backend/alembic/versions/` (新規マイグレーション)
- 関連するサービス・リポジトリ

**受け入れ条件**:
- [ ] `LotReceipt` モデルに `lot_number` カラムが存在しない
- [ ] すべてのロット番号参照が `lot_master.lot_number` 経由
- [ ] マイグレーションが正常に適用される
- [ ] 既存テストが通過する

---

### Task 1.2: FEFO インデックス最適化

**依存関係**: Task 1.1 完了後

**作業内容**:
1. `idx_lot_receipts_fifo_allocation` を `idx_lot_receipts_fefo_allocation` にリネーム
2. `expiry_date` をインデックスに追加

**変更前**:
```python
Index(
    "idx_lot_receipts_fifo_allocation",
    "product_id", "warehouse_id", "status", "received_date", "id",
    postgresql_where=text("status = 'active' AND inspection_status IN ('not_required', 'passed')"),
)
```

**変更後**:
```python
Index(
    "idx_lot_receipts_fefo_allocation",
    "product_id", "warehouse_id", "expiry_date", "received_date", "id",
    postgresql_where=text("status = 'active' AND inspection_status IN ('not_required', 'passed')"),
)
```

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py` (L179-225)
- `backend/alembic/versions/` (新規マイグレーション)

**受け入れ条件**:
- [ ] インデックス名が `fefo` に変更されている
- [ ] `expiry_date` がインデックスに含まれている
- [ ] FEFO クエリのパフォーマンスが維持または向上

---

### Task 1.3: `allocated_quantity` 計算の統一

**依存関係**: Task 1.1 完了後

**問題**: ビュー（ACTIVE + CONFIRMED）とサービス（CONFIRMED のみ）で計算が不一致

**作業内容**:
1. `v_lot_allocations` ビューを CONFIRMED のみに修正
2. ACTIVE は `reserved_quantity_active` として別列で提供
3. ドキュメントに計算式を明記

**変更前** (`v_lot_allocations`):
```sql
WHERE status IN ('active', 'confirmed')
```

**変更後**:
```sql
-- allocated_quantity: CONFIRMED のみ
WHERE status = 'confirmed'

-- reserved_quantity_active: ACTIVE のみ（別列）
WHERE status = 'active'
```

**対象ファイル**:
- `backend/alembic/versions/` (ビュー更新マイグレーション)
- `backend/app/infrastructure/persistence/models/views_models.py`

**受け入れ条件**:
- [ ] `allocated_quantity` が CONFIRMED のみを集計
- [ ] `reserved_quantity_active` 列がビューに追加されている
- [ ] サービス層とビューの計算結果が一致
- [ ] UI で「予約（未確定）」と「確定引当」が別表示

---

## Phase 2: コードリファクタリング

> **前提条件**: Phase 1 完了後

### Task 2.1: `Lot` エイリアス廃止

**依存関係**: Task 1.1 完了後

**作業内容**:
1. `from app.infrastructure.persistence.models import Lot` を検索
2. すべて `LotReceipt` に置換
3. `models/__init__.py` から `Lot = LotReceipt` を削除
4. `inventory_models.py` から `Lot = LotReceipt` を削除

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/__init__.py` (L89, L110)
- `backend/app/infrastructure/persistence/models/inventory_models.py` (L171)
- バックエンド全体の `Lot` 参照箇所

**受け入れ条件**:
- [ ] コードベースに `Lot` エイリアスが存在しない
- [ ] すべてのインポートが `LotReceipt` を使用
- [ ] 型チェック・リンターが通過
- [ ] 既存テストが通過

---

### Task 2.2: `current_quantity` synonym 廃止

**依存関係**: Task 2.1 完了後

**作業内容**:
1. `current_quantity: Mapped[Decimal] = synonym("received_quantity")` を削除
2. 参照箇所を `received_quantity` または `available_quantity` に変更
3. ビューの `current_quantity` は `remaining_quantity` にリネーム

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py` (L130)
- 参照している全サービス・リポジトリ

**受け入れ条件**:
- [ ] `LotReceipt` モデルに `current_quantity` synonym が存在しない
- [ ] 意味に応じて適切な列名を使用している
  - `received_quantity`: 入荷数量（不変）
  - `remaining_quantity`: 残量（動的計算）
  - `available_quantity`: 利用可能（残量 - ロック - 確定引当）
- [ ] 既存テストが通過

---

### Task 2.3: `InventoryTable.tsx` の分割

**依存関係**: なし（Phase 2 内で独立して実施可能）

**作業内容**:
1. ダイアログ状態を単一の `DialogState` 型に統合
2. コンポーネントを以下に分割:
   - `InventoryTableCore.tsx` - テーブル本体
   - `InventoryTableActions.tsx` - アクションボタン
   - `InventoryExpandedRow.tsx` - 展開行コンテンツ
   - `InventoryDialogs.tsx` - ダイアログ群
3. 各ファイルを300行以下に収める

**変更前の状態管理**:
```typescript
const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
const [selectedWithdrawalLot, setSelectedWithdrawalLot] = useState<LotUI | null>(null);
// ... 5つのダイアログ × 2つの状態
```

**変更後**:
```typescript
type DialogState =
  | { type: 'none' }
  | { type: 'withdrawal'; lot: LotUI }
  | { type: 'history'; lot: LotUI }
  | { type: 'quickIntake'; item: InventoryItem }
  | { type: 'edit'; lot: LotUI }
  | { type: 'lock'; lot: LotUI };

const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
```

**対象ファイル**:
- `frontend/src/features/inventory/components/InventoryTable.tsx` (570行 → 分割)

**受け入れ条件**:
- [ ] 各ファイルが300行以下
- [ ] `eslint-disable max-lines` が不要
- [ ] ダイアログが排他的に開く（同時に複数開かない）
- [ ] 既存の機能が維持されている

---

## Phase 3: スケーラビリティ対応

> **前提条件**: Phase 2 完了後（または Phase 2 と並行可能）

### Task 3.1: サーバーサイドページネーション導入

**依存関係**: なし（独立して実施可能）

**作業内容**:

#### バックエンド
1. ロット一覧 API にページネーションパラメータ追加
   - `page`, `page_size`, `total_count` を返す
2. 在庫一覧 API にページネーションパラメータ追加
3. フィルタ条件をサーバーサイドで処理

#### フロントエンド
1. 既存の `TablePagination` コンポーネントを使用
2. `lotTableSettingsAtom` を `InventoryTable` に接続
3. クライアントサイドフィルタリングをサーバーサイドに移行

**対象ファイル**:
- `backend/app/api/routes/` (ロット・在庫関連ルーター)
- `frontend/src/features/inventory/api.ts`
- `frontend/src/features/inventory/components/InventoryTable.tsx`
- `frontend/src/features/inventory/hooks/useLotFilters.ts`

**受け入れ条件**:
- [ ] API が `page`, `page_size`, `total_count` をサポート
- [ ] デフォルト `limit: 100` のハードコードが削除されている
- [ ] 1000件以上のロットでもUIがフリーズしない
- [ ] フィルタ条件がサーバーで処理される

---

### Task 3.2: バーチャルスクロール導入

**依存関係**: Task 3.1 完了後

**作業内容**:
1. `@tanstack/react-virtual` または類似ライブラリを導入
2. `DataTable` コンポーネントにバーチャルスクロール対応を追加
3. 展開行（ロット一覧）にバーチャルスクロールを適用

**対象ファイル**:
- `frontend/package.json` (依存追加)
- `frontend/src/shared/components/data/DataTable.tsx`
- `frontend/src/features/inventory/components/InventoryTable.tsx`

**受け入れ条件**:
- [ ] 10,000行でもスムーズにスクロール可能
- [ ] 展開行のロット一覧もバーチャル化
- [ ] 既存の表示・操作が維持されている

---

### Task 3.3: `decimal.js` 導入

**依存関係**: なし（独立して実施可能）

**作業内容**:
1. `decimal.js` をインストール
2. 数量計算を行う箇所で `Decimal` を使用
3. `useLotFilters.ts` の `Number()` キャストを置換
4. 共通ユーティリティ `shared/utils/decimal.ts` を作成

**対象ファイル**:
- `frontend/package.json`
- `frontend/src/shared/utils/decimal.ts` (新規)
- `frontend/src/features/inventory/hooks/useLotFilters.ts` (L85, L112-114, L125)
- 数量計算を行う全コンポーネント

**受け入れ条件**:
- [ ] `Number()` による浮動小数点変換が排除
- [ ] 小数点以下3桁の精度が保証される
- [ ] `as unknown as` の型キャストが解消
- [ ] 既存の数量表示が維持されている

---

## Phase 4: DBトリガー導入

> **前提条件**: Phase 1-3 完了後、十分なテストを実施

### Task 4.1: `lot_master` 集計値の自動同期トリガー

**依存関係**: Phase 1 完了後

**作業内容**:
1. トリガー設計ドキュメント作成
   - 発火タイミング（INSERT/UPDATE/DELETE on `lot_receipts`）
   - パフォーマンス影響の見積もり
   - ロールバック手順
2. トリガー関数の実装
3. マイグレーション作成
4. ユニットテスト作成

**トリガー仕様**:
```sql
-- lot_receipts の INSERT/UPDATE/DELETE 時に lot_master を更新
CREATE OR REPLACE FUNCTION update_lot_master_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lot_master
    SET
        first_receipt_date = (
            SELECT MIN(received_date)
            FROM lot_receipts
            WHERE lot_master_id = COALESCE(NEW.lot_master_id, OLD.lot_master_id)
        ),
        latest_expiry_date = (
            SELECT MAX(expiry_date)
            FROM lot_receipts
            WHERE lot_master_id = COALESCE(NEW.lot_master_id, OLD.lot_master_id)
        )
    WHERE id = COALESCE(NEW.lot_master_id, OLD.lot_master_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**対象ファイル**:
- `docs/design/lot_master_trigger.md` (新規設計ドキュメント)
- `backend/alembic/versions/` (トリガーマイグレーション)
- `backend/tests/` (トリガーテスト)

**受け入れ条件**:
- [ ] 設計ドキュメントがレビュー済み
- [ ] `LotReceipt` の追加時に `lot_master` が自動更新
- [ ] `LotReceipt` の削除時に `lot_master` が自動更新
- [ ] 大量データ（1000件同時INSERT）でもパフォーマンス劣化が許容範囲
- [ ] ロールバック手順が文書化されている

---

## 依存関係図

```
Phase 1 (DB変更)
├── Task 1.1: lot_number カラム削除
│   ├── Task 1.2: FEFO インデックス最適化
│   └── Task 1.3: allocated_quantity 統一
│
Phase 2 (リファクタリング)
├── Task 2.1: Lot エイリアス廃止 ← Task 1.1
│   └── Task 2.2: current_quantity 廃止 ← Task 2.1
└── Task 2.3: InventoryTable 分割 (独立)
│
Phase 3 (スケーラビリティ)
├── Task 3.1: サーバーサイドページネーション (独立)
│   └── Task 3.2: バーチャルスクロール ← Task 3.1
└── Task 3.3: decimal.js 導入 (独立)
│
Phase 4 (DBトリガー)
└── Task 4.1: lot_master トリガー ← Phase 1
```

---

## 優先度と並行実施可能性

| タスク | 優先度 | 並行可能 | 備考 |
|--------|--------|----------|------|
| **0.1 エラー修正** | **最高** | - | ✅ 完了 |
| **0.2 ユニットテスト** | **最高** | 0.3, 0.5と並行可 | ✅ 完了 |
| 0.3 API統合テスト | **最高** | 0.2, 0.5と並行可 | ← 次のタスク |
| 0.4 フロントテスト | 高 | 0.5と並行可 | 品質基盤 |
| 0.5 在庫計算テスト | 高 | 0.2-0.4と並行可 | 品質基盤 |
| 0.6 E2Eテスト | 中 | - | 0.1-0.5 完了後 |
| 0.7 CI/CD強化 | 中 | - | 全テスト完了後 |
| 1.1 lot_number 削除 | 高 | - | Phase 0 完了後 |
| 1.2 FEFO インデックス | 中 | 1.3と並行可 | |
| 1.3 allocated_quantity 統一 | 高 | 1.2と並行可 | データ整合性に直結 |
| 2.1 Lot エイリアス廃止 | 中 | - | 1.1 完了後 |
| 2.2 current_quantity 廃止 | 中 | - | 2.1 完了後 |
| 2.3 InventoryTable 分割 | 中 | 3.x と並行可 | コード品質改善 |
| 3.1 ページネーション | 中 | 3.3と並行可 | スケーラビリティ |
| 3.2 バーチャルスクロール | 低 | - | 3.1 完了後 |
| 3.3 decimal.js 導入 | 中 | 3.1と並行可 | 精度保証 |
| 4.1 DBトリガー | 低 | - | 慎重に計画 |

---

## リスクと軽減策

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| テスト不足によるリグレッション | 高 | Phase 0 でテストを充実させてから変更 |
| DB変更による既存データ破損 | 高 | DBを空にするタイミングで実施 |
| エイリアス削除の見落とし | 中 | grep で徹底的に検索、CIで型チェック |
| ページネーション導入によるUI変更 | 中 | 既存の `TablePagination` を活用 |
| DBトリガーのパフォーマンス | 中 | 設計ドキュメントで事前検証 |

---

## 詳細実装手順

### Task 1.1: `LotReceipt.lot_number` カラム削除 - 詳細

**Step 1: 参照箇所の変更**

```python
# lot_receipt_models.py - 削除対象 (L92-93)
lot_number: Mapped[str] = mapped_column(String(100), nullable=False)

# 代わりにプロパティを追加（読み取り専用アクセサ）
@property
def lot_number(self) -> str:
    """Get lot number from lot_master (read-only accessor)."""
    return self.lot_master.lot_number if self.lot_master else ""
```

**Step 2: マイグレーション作成**

```python
# backend/alembic/versions/c1_remove_lot_number_from_receipts.py
def upgrade():
    op.drop_index("idx_lot_receipts_number", table_name="lot_receipts")
    op.drop_column("lot_receipts", "lot_number")

def downgrade():
    op.add_column("lot_receipts",
        sa.Column("lot_number", sa.String(100), nullable=True))
    op.execute("""
        UPDATE lot_receipts lr
        SET lot_number = lm.lot_number
        FROM lot_master lm WHERE lr.lot_master_id = lm.id
    """)
    op.alter_column("lot_receipts", "lot_number", nullable=False)
    op.create_index("idx_lot_receipts_number", "lot_receipts", ["lot_number"])
```

---

### Task 1.3: `allocated_quantity` 計算の統一 - 詳細

**Step 1: 新規ビュー作成**

```sql
-- v_lot_allocations: CONFIRMED のみ
CREATE VIEW public.v_lot_allocations AS
SELECT lot_id, SUM(reserved_qty) as allocated_quantity
FROM public.lot_reservations
WHERE status = 'confirmed'
GROUP BY lot_id;

-- v_lot_active_reservations: ACTIVE のみ（新規）
CREATE VIEW public.v_lot_active_reservations AS
SELECT lot_id, SUM(reserved_qty) as reserved_quantity_active
FROM public.lot_reservations
WHERE status = 'active'
GROUP BY lot_id;
```

**Step 2: `v_lot_details` 更新**

```sql
-- SELECT に追加
COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,

-- JOIN に追加
LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
```

**Step 3: views_models.py 更新**

```python
# VLotDetails クラスに追加
reserved_quantity_active: Mapped[Decimal] = mapped_column(default=Decimal(0))
```

---

### Task 2.3: `InventoryTable.tsx` 分割 - 詳細

**分割後のファイル構成**:

```
frontend/src/features/inventory/components/
├── InventoryTable.tsx              # メインオーケストレーター (~150行)
├── InventoryTableCore.tsx          # DataTable ラッパー (~100行)
├── InventoryTableExpandedRow.tsx   # 展開行 (~150行)
├── InventoryTableActions.tsx       # アクションボタン (~80行)
├── InventoryTableDialogs.tsx       # ダイアログ群 (~120行)
└── hooks/
    └── useInventoryTableDialogs.ts # ダイアログ状態管理 (~60行)
```

**useInventoryTableDialogs.ts 実装**:

```typescript
type DialogType = 'none' | 'withdrawal' | 'history' | 'quickIntake' | 'edit' | 'lock';

interface DialogState {
  type: DialogType;
  lot?: LotUI;
  item?: InventoryItem;
}

export function useInventoryTableDialogs() {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  return {
    dialog,
    openWithdrawal: (lot: LotUI) => setDialog({ type: 'withdrawal', lot }),
    openHistory: (lot: LotUI) => setDialog({ type: 'history', lot }),
    openQuickIntake: (item: InventoryItem) => setDialog({ type: 'quickIntake', item }),
    openEdit: (lot: LotUI) => setDialog({ type: 'edit', lot }),
    openLock: (lot: LotUI) => setDialog({ type: 'lock', lot }),
    close: () => setDialog({ type: 'none' }),
  };
}
```

---

### Task 3.1: サーバーサイドページネーション - 詳細

**バックエンド API 変更**:

```python
# inventory_schema.py
class PaginatedInventoryResponse(BaseSchema):
    items: list[InventoryItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# router.py
@router.get("/", response_model=PaginatedInventoryResponse)
async def list_inventory(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    # ... existing params
):
    skip = (page - 1) * page_size
    items, total = service.get_inventory_items_with_count(skip=skip, limit=page_size)
    return PaginatedInventoryResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size)
    )
```

**フロントエンド接続**:

```typescript
// InventoryPage.tsx
const [tableSettings, setTableSettings] = useAtom(lotTableSettingsAtom);

const { data } = useQuery({
  queryKey: ["inventory", tableSettings.page, tableSettings.pageSize, filters],
  queryFn: () => getInventoryItemsPaginated({
    page: (tableSettings.page ?? 0) + 1,
    page_size: tableSettings.pageSize,
    ...filters
  })
});

// JSX
<TablePagination
  currentPage={(tableSettings.page ?? 0) + 1}
  pageSize={tableSettings.pageSize ?? 25}
  totalCount={data?.total ?? 0}
  onPageChange={(page) => setTableSettings(s => ({ ...s, page: page - 1 }))}
  onPageSizeChange={(size) => setTableSettings(s => ({ ...s, pageSize: size, page: 0 }))}
/>
```

---

### Task 3.3: `decimal.js` 導入 - 詳細

**新規ファイル: `shared/utils/decimal.ts`**

```typescript
import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function parseDecimal(value: string | number | null | undefined): Decimal {
  if (value == null) return new Decimal(0);
  return new Decimal(value);
}

export function formatDecimal(value: Decimal, decimals = 3): string {
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value.toNumber());
}

export function calculateAvailable(
  current: string | number,
  allocated: string | number,
  locked: string | number
): Decimal {
  const c = parseDecimal(current);
  const a = parseDecimal(allocated);
  const l = parseDecimal(locked);
  return Decimal.max(c.minus(a).minus(l), new Decimal(0));
}
```

**useLotFilters.ts 修正**:

```typescript
// Before (L85, L125)
const qty = Number(lot.current_quantity);
if (filters.hasStock && Number(lot.current_quantity) <= 0)

// After
import { parseDecimal } from "@/shared/utils/decimal";
const qty = parseDecimal(lot.current_quantity);
if (filters.hasStock && parseDecimal(lot.current_quantity).lte(0))
```

---

## クリティカルファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `backend/app/infrastructure/persistence/models/lot_receipt_models.py` | L92-93削除, L130削除, L214-224修正 |
| `backend/app/infrastructure/persistence/models/__init__.py` | L89, L110 削除 |
| `backend/app/infrastructure/persistence/models/views_models.py` | reserved_quantity_active 追加 |
| `backend/sql/views/create_views.sql` | v_lot_allocations 修正, v_lot_active_reservations 新規 |
| `frontend/src/features/inventory/components/InventoryTable.tsx` | 5ファイルに分割 |
| `frontend/src/features/inventory/hooks/useLotFilters.ts` | L85, L112-114, L125 修正 |
| `frontend/src/shared/utils/decimal.ts` | 新規作成 |
| `backend/app/presentation/api/v2/inventory/router.py` | ページネーション追加 |

---

## 全体フロー

```
Phase 0: 品質基盤整備（最優先）
    ↓ 完了後
Phase 1: DB変更（DBを空にするタイミング）
    ↓ 完了後
Phase 2: コードリファクタリング
    ↓ 並行可能
Phase 3: スケーラビリティ対応
    ↓ 完了後
Phase 4: DBトリガー導入
```

---

## 関連ドキュメント

- `docs/reviews/inventory-lot-management-review_merged.md` - 元のレビュードキュメント
- `CLAUDE.md` - プロジェクト全体のガイドライン
