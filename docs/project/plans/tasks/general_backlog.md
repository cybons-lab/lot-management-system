# タスクバックログ

**区分:** タスク  
**最終更新:** 2026-01-18

## 概要

本ファイルは、未完了のタスク・調査事項を集約したバックログです。完了済みのタスクは別途残さず、本バックログに最新の状態のみを記載します。

## 対応状況

### 未対応

### 1. 重要調査・障害対応

#### 1-1. 入庫履歴が表示されない問題（調査済み）

**症状:** 入庫履歴タブで「入庫履歴はありません」と表示される。  
**原因:** `lot_service.create_lot()` で `StockHistory` の INBOUND レコードが作成されていない。  
**影響:** 画面からのロット新規登録・API経由のロット作成で入庫履歴が欠落する。

**推奨対応:**
1. `lot_service.create_lot()` に INBOUND の `StockHistory` 生成を追加
2. 既存データ用のマイグレーションを用意
3. 入庫履歴画面で再確認

**関連ファイル:**
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/intake_history_service.py`

---

### 2. 優先度高（UI/UX・不整合修正）

#### 2-1. InboundPlansList のテーブルソート機能が動かない

- `sortable: true` なのに `DataTable` へ `sort` / `onSortChange` を渡していない。
- 対象: `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

#### 2-2. InboundPlansList のステータス日本語化

- `planned`, `received` など英語表記のまま。表示用マッピング追加が必要。
- 対象: `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

#### 2-3. フィルターリセットボタンの欠如

- `AdjustmentsListPage`, `WithdrawalsListPage` にリセット操作がない。
- 対象:
  - `frontend/src/features/adjustments/pages/AdjustmentsListPage.tsx`
  - `frontend/src/features/withdrawals/pages/WithdrawalsListPage.tsx`

#### 2-4. ConfirmedLinesPage のSAP一括登録ボタンが重複

- 上下に同じボタンが表示される。
- 対象: `frontend/src/features/orders/pages/ConfirmedLinesPage.tsx`

#### 2-5. Toast通知の不足

- 保存成功時にフィードバックが出ない。
- 対象:
  - `frontend/src/features/warehouses/hooks/useWarehouseMutations.ts`
  - `frontend/src/features/product-mappings/hooks/useProductMappings.ts`
  - `frontend/src/features/delivery-places/hooks/useDeliveryPlaces.ts`

#### 2-6. ProductDetailPage のコード変更後リダイレクト

- 商品コード変更時にURLが更新されず表示が残る。
- 対象: `frontend/src/features/products/pages/ProductDetailPage.tsx`

---

### 3. DB/UI整合性・データ表示改善

#### 3-1. Lots のステータス系フィールドがUI未表示

- `status`, `inspection_status`, `inspection_date`, `inspection_cert_number`, `origin_reference`
- 対象: 在庫一覧・ロット詳細の表示コンポーネント

#### 3-2. Orders の一部フィールドがUI未表示

- `ocr_source_filename`, `cancel_reason`, `external_product_code`, `shipping_document_text`
- 対象: 受注詳細画面

---

### 4. アーキテクチャ/品質改善

#### 4-1. useQuery のエラー処理追加（Phase 2）

- `AllocationDialog.tsx`, `ForecastsTab.tsx`, `InboundPlansTab.tsx`, `WithdrawalCalendar.tsx` など。

#### 4-2. 日付ユーティリティの統合

- `shared/utils/date.ts`, `shared/libs/utils/date.ts`, `features/forecasts/.../date-utils.ts` の重複整理。

#### 4-3. 削除ダイアログの統合

- `SoftDeleteDialog`, `PermanentDeleteDialog`, `BulkSoftDeleteDialog`, `BulkPermanentDeleteDialog` を統合。

---

### 5. テスト・自動化

#### 5-1. テスト基盤拡張（低優先度）

- **C3: Data Factory (Backend) 拡張**: `factory_boy` 等を使用したバックエンドテストデータ生成ファクトリの整備。現在は `services/test_data_generator.py` で代用中。
- **C4: Test Matrix 定義**: テストケースの組み合わせ表（マトリクス）のドキュメント化と管理。
- **Phase D: API統合テスト拡張**: 以下の観点でのバックエンド統合テスト拡充。
  - 主要エンティティCRUD（正常系/異常系）
  - データ整合性テスト（トランザクション境界など）
  - 権限テスト（RBACの徹底確認）

---

### 6. 機能改善・中長期タスク

#### 6-1. DB/UI整合性修正に伴うエクスポート機能

- Forecasts / Orders / Inventory/Lots の Excel エクスポート実装。

#### 6-2. ダッシュボードの可視化（recharts）

- KPIのみのダッシュボードにグラフを追加。

#### 6-3. SAP連携タスク

- 本番API接続、二重計上防止のべき等性対応、在庫同期。

#### 6-4. フォーキャスト単位の引当推奨生成

- 既存は全期間一括のみ。フォーキャストグループ単位での生成が必要。

#### 6-5. 入荷予定の倉庫データ取得改善

- `InboundPlan`ヘッダーに倉庫情報がなく「未指定」に集約される問題。

#### 6-6. OpenAPI型定義の導入

- `openapi-typescript` を利用した型生成でフロント/バックの整合性を確保。

---

### 7. 保留（再現確認・調査待ち）

#### 7-1. フォーキャスト編集後の更新問題

- フォーキャスト編集後、計画引当サマリ・関連受注が更新されない。
- 手動リフレッシュでは回避可能。バックエンド再計算の確認が必要。

---

### 8. ユーザーフィードバック・機能改善 (2026-01-18追加)

#### 8-1. 過去データの可視性向上

- **入荷予定一覧**: 過去データの表示確認と「過去/未来」タブまたはフィルタの実装。
- **受注管理**: 過去の受注データの表示確認とステータス/日付フィルタの強化。
- **フォーキャスト一覧**: 「履歴」タブの機能確認とフロントエンド実装（`/history`エンドポイント活用）。

#### 8-2. アーカイブ済みロットの表示バグ

- **症状**: 在庫ロット一覧で「アーカイブ済みを表示」にチェックを入れても、アーカイブ済みロットが表示されない（または期待通りに機能しない）。
- **タスク**: フィルタリングロジック（バックエンド/フロントエンド）の調査と修正。

#### 8-3. フロントエンド・コンソールエラー

- **症状**: React Key重複エラー（"Encountered two children with the same key"）などがコンソールに出力されている。
- **タスク**: リストレンダリング時のkey生成ロジック修正。

#### 8-4. 在庫詳細の仕入先固定

- **要望**: 在庫詳細画面において、仕入先が固定（または明確化）されるべき。
- **タスク**: 製品×倉庫のコンテキストにおける仕入先特定ロジックの実装とUI反映。

### 対応済み

- なし


---

# TODO Items

# TODO

**区分:** タスク  
**最終更新:** 2026-01-10

## 概要

このドキュメントには、今後実装が必要なタスクをまとめています。

## 対応状況

### 未対応

### 未実装 API エンドポイント

以下のPOSTエンドポイントはテストコード（`tests/error_scenarios/`）に記載がありますが、まだ実装されていません。

#### 優先度: 中

| エンドポイント | 説明 | 関連テスト |
|---------------|------|-----------|
| `POST /api/roles/` | ロール作成API | `test_constraints.py::test_duplicate_role_code` |
| `POST /api/orders/` | 受注作成API | `test_validation_errors.py::test_create_order_validation_error` |
| `POST /api/inbound-plans/` | 入荷計画作成API | `test_validation_errors.py::test_create_inbound_plan_validation_error` |
| `POST /api/adjustments/` | 在庫調整作成API | `test_validation_errors.py::test_create_adjustment_validation_error` |

> **Note**: これらのテストは現在 `@pytest.mark.skip` でスキップされています。
> 実装完了後、スキップマーカーを削除してテストを有効化してください。

### 対応済み

### テストデータ生成の問題

#### inventory_scenarios のデータが正しく表示されない

**優先度: 高**

**問題:**
- [x] 管理画面の「テストデータ生成」実行後、在庫一覧で inventory-scenario のロットが以下の状態になっている：
  - 利用可能数量: 0（期待値: 100など）
  - 確定引当数量: 0（期待値: 30など）
  - 現在在庫が consumed_quantity により減少している

**原因調査:**
1. ✅ `inventory_scenarios.py` の outbound テーブルエラーを修正（outbound テーブルが存在しない場合でもスキップ）
2. ✅ `withdrawals.py` で inventory-scenario ロットを除外するフィルタを追加
3. ✅ `v_lot_details` と `v_inventory_summary` ビューを修正し、`current_quantity` を `received - consumed` から動的に計算するように変更（物理カラムの不整合を解消）

**解決:** 
- 2026-01-18: マイグレーション `b77dcffc2d98` によりビュー定義を修正し、消費（consumed）が現在在庫に即座に反映されるようになりました。

**備考 (Schema Notes):**
- `outbound_instructions`, `outbound_allocations`:
  - これらはコード上（テストデータ生成スクリプト等）に一部名称が登場しますが、現時点のデータベース・スキーマには存在しません。
  - おそらく将来的な出荷指示・引当管理機能のために予約されている名称であり、現状は無視して問題ありません（存在しない場合はスキップされます）。

**関連ファイル:**
- `backend/app/application/services/test_data/inventory_scenarios.py`
- `backend/app/application/services/test_data/withdrawals.py`
- `docs/testing/inventory-test-data-scenarios.md`（期待される仕様）

**参考:**
```sql
-- inventory-scenario ロットの現在の状態を確認
SELECT lr.id, lm.lot_number, lr.received_quantity, lr.consumed_quantity,
       lr.locked_quantity, (lr.received_quantity - lr.consumed_quantity) as current_qty,
       COALESCE(SUM(res.reserved_qty) FILTER (WHERE res.status = 'confirmed'), 0) as confirmed
FROM lot_receipts lr
JOIN lot_master lm ON lm.id = lr.lot_master_id
LEFT JOIN lot_reservations res ON res.lot_id = lr.id
WHERE lr.origin_reference LIKE '%inventory-scenario%'
GROUP BY lr.id, lm.lot_number, lr.received_quantity, lr.consumed_quantity, lr.locked_quantity
ORDER BY lr.id;
```


---

# Future Improvements

# Future Improvements

**区分:** タスク  
**最終更新:** 記載なし

## 概要

このファイルには、将来的に実装すべき改善タスクをリストします。

## 対応状況

### 未対応

### テスト環境の改善

#### テストDBでAlembic Migrationsを実行

**優先度**: Medium  
**難易度**: Medium  
**想定工数**: 2-3日

##### 背景

現在、テスト環境では `Base.metadata.create_all()` でテーブルを作成しているため、本番環境（Alembic Migrations使用）と以下の差異が発生します：

1. **server_default値の違い**
   - 例: `consumed_quantity` カラムは、モデル定義では `server_default=text("0")` だが、Migrationでは `server_default=None`
   - テストでは `server_default="0"` が適用されるが、本番では明示的に値を設定しないとエラー

2. **Database Triggersの未適用**
   - Migrationで定義されたトリガーがテスト環境に存在しない

3. **Constraintsの違い**
   - Migrationで追加/削除されたConstraintsがテストに反映されない

4. **Migration自体のバグ検出不可**
   - Migrationのバグ（依存関係エラー、SQLエラー等）をテストで検出できない

##### 問題点

2026-01-18時点で、Alembic Migrationsをテストで実行しようとすると以下の問題が発生：

1. **Migration依存関係の複雑さ**
   - 現在70+ migrationsが存在し、多数のmergepoint/branchpointがある
   - 依存関係が複雑で、テーブルが正しい順序で作成されない

2. **Migration実行エラー**
   - `consumed_quantity` migration (`a1b2c3d4e5f7`) が `lot_receipts` テーブル不在でエラー
   - 先行するmigrationが正しく実行されていない可能性

##### 解決策（将来実装時）

**前提条件**: Migrationファイルの整理・統合が完了していること

```python
# tests/conftest.py
@pytest.fixture(scope="session")
def db_engine():
    if os.getenv("TEST_DB_PRE_INITIALIZED"):
        yield engine
        return

    # Configure Alembic to use test database
    os.environ["DATABASE_URL"] = SQLALCHEMY_DATABASE_URL

    try:
        alembic_cfg = Config("alembic.ini")

        # Drop existing schema
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))

        # Run migrations
        command.upgrade(alembic_cfg, "head")

        yield engine

        # Cleanup
        command.downgrade(alembic_cfg, "base")
    finally:
        if "DATABASE_URL" in os.environ:
            del os.environ["DATABASE_URL"]
```

##### メリット

- ✅ テストと本番で完全に同じスキーマ
- ✅ Migration bugs の検出
- ✅ server_default, triggers, constraints の差異検出
- ✅ 本番環境と同じデータで回帰テスト可能

##### デメリット

- ❌ テスト起動時間が増加（初回migration実行分）
- ❌ Migrationが複雑な場合、テストが壊れやすい

##### 実装タイミング

以下のいずれかの条件を満たした時点で実装：

1. **Migrationの統合・整理が完了**
   - 70+ migrationsを10-20個程度に統合
   - Merge/branchpointの削減
   - 依存関係の明確化

2. **スキーマの大幅変更時**
   - 大規模リファクタリング時に合わせて実装

3. **Migration関連のバグが頻発**
   - テスト環境で検出できない問題が増えた場合

##### 暫定対策（現在実装済み）

1. **アプリケーション層でのデフォルト値設定**
   - `consumed_quantity=Decimal("0")` を全LotReceipt作成箇所で明示設定
   - `lot_service.py:740`
   - `inbound_receiving_service.py:106, 144`
   - `test_data/inventory.py:159`

2. **テストコードの修正**
   - テストでもLotReceipt作成時に `consumed_quantity=Decimal("0")` を明示設定

3. **ドキュメント化**
   - この差異を明確に記録（このファイル）

##### 関連Issue

- #xxx (将来作成予定): Migrate to Alembic-based test database setup

##### 参考リンク

- [Alembic Documentation - Running Tests](https://alembic.sqlalchemy.org/en/latest/cookbook.html#test-with-migrations)
- [SQLAlchemy Testing Guide](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

---

### その他の改善タスク

#### データ再読み込みボタンの共通化

**優先度**: Medium
**難易度**: Low
**想定工数**: 0.5-1日

##### 背景

現在、OCR結果ページには手動でデータを再読み込みするボタンが実装されています（2026-01-23実装）。しかし、他のデータ一覧ページ（出荷用マスタ、在庫一覧、受注一覧など）には同様の機能がありません。

ユーザーがF5キーでページ全体をリロードすると、以下の問題が発生します：
- ログイン状態が失われる可能性
- フォーム入力内容が消える
- アプリケーション全体の再初期化が発生（不要なリソース消費）

##### 現在の実装（OCR結果ページ）

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    toast.success("データを再読み込みしました");
  }}
  disabled={isLoading}
>
  <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
  再読み込み
</Button>
```

##### 提案: 共通コンポーネント化

**ファイル**: `frontend/src/shared/components/data/RefreshButton.tsx`

```tsx
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface RefreshButtonProps {
  queryKey: string[];
  isLoading?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link";
  successMessage?: string;
  className?: string;
}

export function RefreshButton({
  queryKey,
  isLoading = false,
  size = "sm",
  variant = "outline",
  successMessage = "データを再読み込みしました",
  className,
}: RefreshButtonProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
    toast.success(successMessage);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isLoading}
      className={className}
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
      再読み込み
    </Button>
  );
}
```

**使用例**:

```tsx
// OCR結果ページ
<RefreshButton queryKey={["ocr-results"]} isLoading={isLoading} />

// 出荷用マスタページ
<RefreshButton queryKey={["shipping-masters"]} isLoading={isLoading} />

// 在庫一覧ページ
<RefreshButton queryKey={["inventory"]} isLoading={isLoading} />
```

##### 対象ページ

以下のページに再読み込みボタンを追加（基本的に読み取り専用以外の全ページ）：

1. **完了**: OCR結果ページ (`OcrResultsListPage.tsx`)
2. **未実装**: 出荷用マスタページ (`ShippingMasterListPage.tsx`)
3. **未実装**: 在庫一覧ページ (`InventoryListPage.tsx`)
4. **未実装**: 受注一覧ページ (`OrdersListPage.tsx`)
5. **未実装**: ロット一覧ページ (`LotsListPage.tsx`)
6. **未実装**: 仕入先マスタページ (`SuppliersListPage.tsx`)
7. **未実装**: 得意先マスタページ (`CustomersListPage.tsx`)
8. **未実装**: SAP統合ページ（キャッシュデータ表示） (`DataFetchTab.tsx`)
9. **未実装**: フォーキャストページ (`ForecastPage.tsx`)

##### 改善案: 共通アクションバーコンポーネント

全ページ共通のアクションセット（エクスポート・インポート・更新など）を提供する共通コンポーネントを作成することで、さらに保守性が向上します。

**ファイル**: `frontend/src/shared/components/data/PageActionBar.tsx`

```tsx
interface PageActionBarProps {
  queryKey: string[];
  isLoading?: boolean;
  onExport?: () => void;
  onImport?: () => void;
  customActions?: React.ReactNode;
}

export function PageActionBar({
  queryKey,
  isLoading,
  onExport,
  onImport,
  customActions,
}: PageActionBarProps) {
  return (
    <div className="flex gap-2">
      <RefreshButton queryKey={queryKey} isLoading={isLoading} />
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Excelエクスポート
        </Button>
      )}
      {onImport && (
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="mr-2 h-4 w-4" />
          インポート
        </Button>
      )}
      {customActions}
    </div>
  );
}
```

##### メリット

- ✅ ユーザーがF5を使わずにデータを更新可能
- ✅ ログイン状態・フォーム入力の保持
- ✅ UIの一貫性向上
- ✅ 共通コンポーネント化による保守性向上

##### 実装タイミング

- UI統一を行うタイミング
- または、ユーザーからF5リロードに関するフィードバックがあった場合

##### 関連ファイル

- `frontend/src/features/ocr-results/pages/OcrResultsListPage.tsx` (実装済み)
- `frontend/src/shared/components/data/RefreshButton.tsx` (未作成)

---

### システム基盤・設計の改善

#### 在庫計算ロジックの厳密化とSSOT固定
**優先度**: High  
**難易度**: Medium  
**想定工数**: 2-3日

##### 背景・課題
- ドメイン定義（仮予約Activeは在庫を減らさない）と、現在のビュー/サービス計算に一部乖離や二重控除のリスクが指摘されている。
- 「利用可能在庫」の真の情報源（SSOT）を1箇所に固定し、不整合を排除する必要がある。

##### タスク内容
1. `allocated_quantity` の定義を `confirmed_only` に統一し、Activeは `reserved_quantity_active` 等で分離表示する。
2. ロック数量の二重控除（ビューで減算済みかつ計算ロジックでも減算）のリスクを解消。
3. UI上の説明（ツールチップ等）と実計算式を完全に一致させる。

#### 大量データ表示の完全対応 (ページネーション)
**優先度**: High  
**難易度**: Medium  
**想定工数**: 2-3日

##### 背景・課題
- 一部のAPI（ロット取得等）にデフォルトの `limit: 100` があり、ページングがないため大量データ時に欠落が発生している。
- 全件取得してからクライアント側で絞り込む実装を廃止し、ネットワーク・メモリ負荷を軽減する必要がある。

##### タスク内容
1. ロット一覧および在庫一覧APIへの完全なサーバーサイドページネーション導入。
2. フロントエンドでの無限スクロールまたはバーチャルスクロール対応。

#### 商品識別設計のビジネス実態への適合
**優先度**: Medium  
**難易度**: High  
**想定工数**: 5-7日

##### 背景・課題
- 現状の実装は `maker_part_code`（メーカー品番/内部コード）中心だが、ビジネス実態は9割が「先方品番（Customer Part No）」ベースである。
- ユーザーの直感に合わせた識別子設計への見直しが必要。

##### タスク内容
1. 先方品番をプライマリな検索/識別キーとして扱えるよう設計を見直す。
2. `Product` マスタにおける複数品番（メーカー品番、先方品番、内部コード）の優先順位と用途を整理し、命名を改善する。

---

### Phase 3: 体系的なテストコード作成

**優先度**: High  
**難易度**: Medium  
**想定工数**: 3-5日

##### 背景
Phase 0〜2の実装により、フロントエンドおよびバックエンドの主要機能は完成しましたが、これまでテストと検証は主に手動で行われてきました。今後の改修時にデグレード（先祖返り）を防ぎ、品質を維持するために、体系的なテストコードの追加が必要です。

##### タスク内容
1. **バックエンドテストの強化**
   - APIユニットテストの追加
   - 複雑なロジック（ロット引き当て、納期計算など）の境界値テスト
2. **E2Eテストの実装**
   - PlaywrightまたはCypressを使用した主要シナリオの自動化
   - OCRスキャンからSAP連携、マニュアル編集までのワークフロー検証
3. **SAP連携 (#488) 対応範囲のテストデータ作成**
   - 直近のSAP連携で対応したAPIおよびフロントエンド機能のための体系的なテストデータを整備する。
   - 異常系（通信エラー、認証エラーなど）のパターンを網羅したデータを作成する。

---

### Phase 4以降：将来的な改善・拡張

**優先度**: Low〜Medium  
**難易度**: Medium〜High

##### 背景
現在のマニュアル操作や設定の一部を、より自動化・高度化することで、業務効率をさらに向上させます。

##### タスク内容
1. **マッピング設定のUI化**
   - 現在コードベースで行っているOCRテキスト置換や品目マッピングの設定を、管理用UIから変更可能にする。
2. **AIを活用した補完機能**
   - 過去の編集履歴を教師データとして学習し、OCR結果の不明瞭な箇所をより高い精度で自動補完する。
3. **ダッシュボード機能**
   - ロット管理状況やOCR処理速度、エラー発生率などを視覚化するダッシュボードの追加。
4. **OCR結果と受注管理の統合**
   - OCRで読み取った結果を受注データとして直接取り込み、受注管理機能とシームレスに連携させることで、入力作業のさらなる自動化を図る。
5. **scripts と tools ディレクトリの整理・定義明確化**
   - 現在、運用系スクリプト（scripts）と開発・CIツール（tools）の境界が曖昧なため、役割を再定義して整理する。
   - `scripts`: 本番/テスト環境のデータ補正、バックアップ、デプロイなどの運用・メンテナンス系。
   - `tools`: 静的解析、ドキュメント自動生成、開発補助ユーティリティなどの開発・CI系。
6. **DB整合性維持の自動化 (DB Triggers)**
   - `lot_master` の集計値（初回入荷日、最終有効期限等）をDBトリガーで自動更新し、アプリケーション側での更新漏れを防ぐ。

---

### 対応済み

- なし
