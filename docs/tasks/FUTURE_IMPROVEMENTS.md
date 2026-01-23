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

以下のページに再読み込みボタンを追加：

1. **完了**: OCR結果ページ (`OcrResultsListPage.tsx`)
2. **未実装**: 出荷用マスタページ (`ShippingMasterListPage.tsx`)
3. **未実装**: 在庫一覧ページ (`InventoryListPage.tsx`)
4. **未実装**: 受注一覧ページ (`OrdersListPage.tsx`)
5. **未実装**: ロット一覧ページ (`LotsListPage.tsx`)
6. **未実装**: 仕入先マスタページ (`SuppliersListPage.tsx`)
7. **未実装**: 得意先マスタページ (`CustomersListPage.tsx`)
8. **未実装**: SAP統合ページ（キャッシュデータ表示） (`DataFetchTab.tsx`)

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

### 対応済み

- なし
