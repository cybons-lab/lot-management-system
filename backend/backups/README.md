# Database Backups

このディレクトリには、データベースのバックアップファイルが保存されます。

## バックアップの作成

### 基本的な使い方

```bash
# デフォルト（backups/backup_YYYYMMDD_HHMMSS.sql）
python scripts/backup_database.py

# ファイル名を指定
python scripts/backup_database.py --output backups/before_migration.sql

# 圧縮してサイズを削減
python scripts/backup_database.py --compress
```

### Docker環境の場合

```bash
# コンテナ内から実行
docker compose exec backend python scripts/backup_database.py

# または、ホストから直接pg_dump
docker compose exec db pg_dump -U postgres lot_management_db > backups/backup.sql
```

## バックアップの復元

### 通常のSQLファイル

```bash
# PostgreSQLに直接復元
psql -h localhost -p 5432 -U postgres -d lot_management_db < backups/backup.sql

# Docker環境の場合
docker compose exec -T db psql -U postgres -d lot_management_db < backups/backup.sql
```

### 圧縮ファイル（.gz）

```bash
# 解凍しながら復元
gunzip -c backups/backup.sql.gz | psql -h localhost -p 5432 -U postgres -d lot_management_db

# Docker環境の場合
gunzip -c backups/backup.sql.gz | docker compose exec -T db psql -U postgres -d lot_management_db
```

## 注意事項

- ⚠️ バックアップファイルには機密情報が含まれるため、`.gitignore` で除外されています
- ⚠️ 復元前に必ず既存データのバックアップを取ってください
- ⚠️ 復元は既存データを上書きします

## マイグレーション前の推奨手順

```bash
# 1. バックアップを取得
python scripts/backup_database.py --output backups/before_migration_$(date +%Y%m%d).sql

# 2. マイグレーション実行
docker compose exec backend alembic upgrade head

# 3. 問題があれば復元
# docker compose down -v
# docker compose up -d db
# 上記の復元コマンドを実行
```
