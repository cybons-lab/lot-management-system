# バックアップアーカイブ

このディレクトリには、過去のデータベースバックアップファイルが保存されています。

## 削除予定日

**削除予定日**: 2025年12月25日

このディレクトリ内のファイルは、1ヶ月後（2025年12月25日）に削除する予定です。

## 保存されているファイル

- `lot_management_before_v2_2.sql` - v2.2アップグレード前のバックアップ (2025/11/15)

## 現在のバックアップ

最新のデータベースバックアップは、`backups/`ディレクトリ直下にあります:

- `schema_only_YYYYMMDD_HHMMSS.sql` - スキーマのみのダンプ
- `full_dump_YYYYMMDD_HHMMSS.sql` - データを含む完全なダンプ

## バックアップの取得方法

```bash
# スキーマのみ
docker exec lot-db-postgres pg_dump -U admin -d lot_management --schema-only --clean --if-exists > backups/schema_only_$(date +%Y%m%d_%H%M%S).sql

# 完全ダンプ (データ含む)
docker exec lot-db-postgres pg_dump -U admin -d lot_management --clean --if-exists > backups/full_dump_$(date +%Y%m%d_%H%M%S).sql
```
