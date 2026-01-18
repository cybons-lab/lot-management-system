# マイグレーションのベースライン化手順

## 目的

マイグレーション履歴が複雑化した場合、本番DB適用後の状態を新しいベースラインとして設定します。
これにより、新規環境構築時のマイグレーション実行時間を短縮し、依存関係の問題を回避できます。

## 前提条件

- 本番環境で全マイグレーションが正常に適用済み
- 本番DBのスキーマが正常に動作している
- マイグレーション履歴に未適用のものがない

## 手順

### 1. 本番DBのスキーマをダンプ

```bash
# 本番環境でスキーマのみをダンプ（データは含めない）
pg_dump -h <本番DBホスト> -U <ユーザー> -d lot_management \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=baseline_schema_$(date +%Y%m%d).sql

# マイグレーション履歴テーブルも含める
pg_dump -h <本番DBホスト> -U <ユーザー> -d lot_management \
  --table=alembic_version \
  --data-only \
  --no-owner \
  --no-privileges \
  --file=baseline_alembic_version_$(date +%Y%m%d).sql
```

### 2. ベースラインマイグレーションの作成

```bash
cd backend

# 現在の HEAD リビジョンを確認
docker compose exec backend alembic current

# 出力例: f30373801237 (head)
# このリビジョン ID をメモしておく

# 新しいベースラインマイグレーションを作成
docker compose exec backend alembic revision \
  --rev-id baseline_20260119 \
  --message "Baseline: Production schema as of 2026-01-19"
```

### 3. ベースラインマイグレーションの編集

`alembic/versions/baseline_20260119_baseline_production_schema_as_of.py`:

```python
"""Baseline: Production schema as of 2026-01-19

This migration creates the complete schema from production as a baseline.
Use this for new environments instead of running all historical migrations.

Revision ID: baseline_20260119
Revises: None
Create Date: 2026-01-19
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "baseline_20260119"
down_revision = None  # ベースラインなので依存なし
branch_labels = ("baseline",)  # ベースラインであることを明示
depends_on = None


def upgrade() -> None:
    """
    本番環境のスキーマを完全に再現します。
    baseline_schema_20260119.sql の内容をここに含めます。
    """
    # baseline_schema_20260119.sql の内容を読み込んで実行
    with open("alembic/baselines/baseline_schema_20260119.sql") as f:
        baseline_sql = f.read()
        op.execute(baseline_sql)

    # alembic_version テーブルに現在の HEAD を記録
    # 注: この時点では baseline_20260119 自体は記録されない
    # 代わりに、本番環境で最後に適用されたマイグレーションを記録
    op.execute(
        "INSERT INTO alembic_version (version_num) "
        "VALUES ('f30373801237')"  # 本番環境の HEAD リビジョン
    )


def downgrade() -> None:
    """
    ベースラインのダウングレードは全テーブル削除を意味します。
    """
    # 全テーブルを削除（開発環境のみで実行すること！）
    op.execute("DROP SCHEMA public CASCADE")
    op.execute("CREATE SCHEMA public")
```

### 4. ベースラインファイルの配置

```bash
# ベースラインディレクトリを作成
mkdir -p alembic/baselines

# ダンプしたスキーマファイルを配置
cp baseline_schema_20260119.sql alembic/baselines/

# Git に追加
git add alembic/baselines/baseline_schema_20260119.sql
git add alembic/versions/baseline_20260119_baseline_production_schema_as_of.py
git commit -m "feat: Add migration baseline from production (2026-01-19)"
```

### 5. 既存マイグレーションの整理

ベースライン以前のマイグレーションは `alembic/versions/archive/` に移動:

```bash
mkdir -p alembic/versions/archive

# ベースライン以前のマイグレーションをアーカイブ
# (baseline_20260119 より古いリビジョン ID のファイル)
mv alembic/versions/000000000000_*.py alembic/versions/archive/
mv alembic/versions/bd41467bfaf6_*.py alembic/versions/archive/
# ... 以下同様

# Git にコミット
git add alembic/versions/archive/
git commit -m "chore: Archive pre-baseline migrations"
```

### 6. 新規環境での利用

#### オプション A: ベースラインから開始（推奨）

```bash
# 空のDBから開始
docker compose down -v
docker compose up -d db-postgres
sleep 10

# ベースラインマイグレーションのみを適用
docker compose up -d backend
docker compose exec backend alembic upgrade baseline_20260119

# ベースライン以降のマイグレーションを適用
docker compose exec backend alembic upgrade head
```

#### オプション B: 履歴全体を適用（検証用）

```bash
# アーカイブからマイグレーションを復元して全実行
# （CI やテスト環境で履歴の整合性を確認する場合）
cp alembic/versions/archive/*.py alembic/versions/
docker compose exec backend alembic upgrade head
```

---

## 増分パッチの作成と適用

### 開発環境でパッチを作成

```bash
# 1. 開発環境で最新の状態を確認
docker compose exec backend alembic current

# 2. スキーマ変更を実施（例: 新しいテーブルを追加）
docker compose exec backend alembic revision --autogenerate -m "add new feature table"

# 3. マイグレーションファイルを確認・編集
# alembic/versions/<リビジョンID>_add_new_feature_table.py

# 4. 開発環境で適用してテスト
docker compose exec backend alembic upgrade head

# 5. テストを実行
docker compose exec backend pytest

# 6. スキーマダンプを生成（パッチ検証用）
docker compose exec db-postgres pg_dump -U admin -d lot_management \
  --schema-only \
  --no-owner \
  --file=/tmp/schema_after_patch.sql
docker compose cp db-postgres:/tmp/schema_after_patch.sql ./schema_after_patch.sql
```

### 本番環境への適用手順

```bash
# 1. 本番環境のバックアップ
pg_dump -h <本番DBホスト> -U <ユーザー> -d lot_management \
  --format=custom \
  --file=backup_before_patch_$(date +%Y%m%d_%H%M%S).dump

# 2. マイグレーション履歴を確認
# SSH で本番環境に接続
ssh <本番サーバー>
cd /path/to/lot-management-system

# 現在の HEAD を確認
docker compose exec backend alembic current

# 3. コードをデプロイ（新しいマイグレーションファイルを含む）
git pull origin main

# 4. マイグレーションを適用（DRY RUN）
# 実際には実行せず、SQL だけを表示
docker compose exec backend alembic upgrade head --sql > migration_plan.sql

# 5. migration_plan.sql を確認
less migration_plan.sql

# 6. 本番環境に適用
docker compose exec backend alembic upgrade head

# 7. 適用結果を確認
docker compose exec backend alembic current
docker compose exec backend alembic history | head -10

# 8. アプリケーションの動作確認
curl -f http://localhost:8000/api/health || echo "Health check failed!"

# 9. テストデータで動作確認
# (適切なテストスクリプトを実行)
```

### ロールバック手順（問題発生時）

```bash
# 1. 直前のリビジョンにダウングレード
docker compose exec backend alembic downgrade -1

# または特定のリビジョンまで戻す
docker compose exec backend alembic downgrade <前のリビジョンID>

# 2. バックアップからリストア（最終手段）
pg_restore -h <本番DBホスト> -U <ユーザー> -d lot_management \
  --clean --if-exists \
  backup_before_patch_20260119_143022.dump
```

---

## パッチ作成のベストプラクティス

### 1. マイグレーションファイルの命名規則

```
<リビジョンID>_<簡潔な説明>.py

例:
- a1b2c3d4e5f6_add_shipping_date_column.py
- b2c3d4e5f6g7_create_analytics_tables.py
- c3d4e5f6g7h8_fix_inventory_view.py
```

### 2. マイグレーションの粒度

- **1マイグレーション = 1つの機能変更**
- テーブル追加、列追加、インデックス作成など、論理的にまとまる単位で分割
- 大きな変更は複数のマイグレーションに分割（ロールバック容易性のため）

### 3. downgrade() の実装

```python
def upgrade() -> None:
    op.add_column("products", sa.Column("new_field", sa.String(100)))

def downgrade() -> None:
    # 必ず downgrade を実装する
    op.drop_column("products", "new_field")
```

### 4. データマイグレーションの分離

スキーマ変更とデータ移行は別のマイグレーションに:

```python
# マイグレーション 1: スキーマ変更
def upgrade() -> None:
    op.add_column("products", sa.Column("status", sa.String(20)))

# マイグレーション 2: データ移行
def upgrade() -> None:
    op.execute("UPDATE products SET status = 'active' WHERE deleted_at IS NULL")
    op.execute("UPDATE products SET status = 'deleted' WHERE deleted_at IS NOT NULL")
```

### 5. ビューの再作成

ビュー変更時は必ず `DROP VIEW IF EXISTS ... CASCADE`:

```python
def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")
    op.execute("""
        CREATE VIEW v_inventory_summary AS
        SELECT ...
    """)
```

---

## トラブルシューティング

### 問題: マイグレーションが途中で失敗

```bash
# 1. alembic_version テーブルを確認
docker compose exec db-postgres psql -U admin -d lot_management -c "SELECT * FROM alembic_version"

# 2. 手動で失敗したマイグレーションを削除
docker compose exec db-postgres psql -U admin -d lot_management -c \
  "DELETE FROM alembic_version WHERE version_num = '<失敗したリビジョンID>'"

# 3. 再実行
docker compose exec backend alembic upgrade head
```

### 問題: マイグレーション履歴が不整合

```bash
# alembic_version テーブルをリセット
docker compose exec db-postgres psql -U admin -d lot_management -c "TRUNCATE alembic_version"

# 現在のスキーマに対応する最新のリビジョンを手動で設定
docker compose exec backend alembic stamp head
```

### 問題: 開発環境と本番環境でスキーマが異なる

```bash
# 両方のスキーマをダンプして比較
pg_dump <開発DB> --schema-only --no-owner > dev_schema.sql
pg_dump <本番DB> --schema-only --no-owner > prod_schema.sql
diff dev_schema.sql prod_schema.sql
```

---

## チェックリスト

### ベースライン化実施前

- [ ] 本番環境で全マイグレーションが適用済み
- [ ] 本番DBのバックアップを取得
- [ ] 開発環境でベースラインマイグレーションをテスト
- [ ] CI でベースラインマイグレーションが通ることを確認

### パッチ適用前

- [ ] 開発環境でマイグレーションをテスト
- [ ] ロールバック手順を確認
- [ ] 本番DBのバックアップを取得
- [ ] メンテナンスウィンドウを確保（必要に応じて）
- [ ] downgrade() が正しく実装されている

### 適用後

- [ ] alembic current で最新リビジョンを確認
- [ ] アプリケーションの動作確認
- [ ] ログにエラーがないか確認
- [ ] パフォーマンスに問題がないか確認

---

## 関連ファイル

- `alembic/env.py` - Alembic 設定
- `alembic/versions/` - マイグレーションファイル
- `alembic/versions/archive/` - アーカイブされた古いマイグレーション
- `alembic/baselines/` - ベースラインスキーマファイル

## 参考

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
