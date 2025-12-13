---
description: マイグレーション作業時の安全手順
---

# マイグレーション作業時の安全手順

マイグレーションを作成・変更・適用する際は、必ず以下の手順に従うこと。

## 1. 作業前のダンプ取得

```bash
# スキーマダンプ（テーブル定義のみ）
docker exec lot-db-postgres pg_dump -U admin -d lot_management --schema-only --no-owner --no-acl > backend/dumps/schema_before_YYYYMMDD.sql

# 完全ダンプ（データ含む場合）
docker exec lot-db-postgres pg_dump -U admin -d lot_management --no-owner --no-acl > backend/dumps/full_before_YYYYMMDD.sql
```

## 2. マイグレーション作成・適用

```bash
# 新規マイグレーション生成
cd backend && uv run alembic revision --autogenerate -m "description"

# マイグレーション適用
cd backend && uv run alembic upgrade head
```

## 3. 作業後のダンプ取得

```bash
docker exec lot-db-postgres pg_dump -U admin -d lot_management --schema-only --no-owner --no-acl > backend/dumps/schema_after_YYYYMMDD.sql
```

## 4. 差分確認

```bash
diff backend/dumps/schema_before_YYYYMMDD.sql backend/dumps/schema_after_YYYYMMDD.sql
```

## 5. ダンプファイルの保管

- `backend/dumps/` ディレクトリにダンプを保存
- 主要なマイグレーション後は `schema_YYYYMMDD.sql` として保持
- `.gitignore` に追加されていることを確認（機密データ防止）

## 注意事項

- **DBを DROP する前に必ずダンプを取得**すること
- マイグレーション統合時は特に慎重に（元に戻せなくなる）
- autogenerate は SQLAlchemy モデルとの差分を生成するため、モデルが正しいことを前提とする
