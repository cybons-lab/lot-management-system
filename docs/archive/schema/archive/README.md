# アーカイブファイルについて

このディレクトリには、過去のスキーマバージョンのSQLファイルが保存されています。

## 削除予定日

**削除予定日**: 2025年12月25日

このディレクトリ内のファイルは、1ヶ月後（2025年12月25日）に削除する予定です。
それまでの間は参考資料として保管されます。

## 保存されているファイル

- `lot_management_ddl_v2.2.sql` - バージョン2.2のDDL
- `lot_management_ddl_v2_2_id.sql` - バージョン2.2のDDL (ID版)
- `lot_management_schema_v2.3.sql` - バージョン2.3のスキーマ
- `lot_management_schema_v2.4.sql` - バージョン2.4のスキーマ
- `lot_management_schema_v2.5.sql` - バージョン2.5のスキーマ

## 現在のスキーマ管理

現在のデータベーススキーマは以下で管理されています:

- **Alembicマイグレーション**: `backend/alembic/versions/`
- **SQLAlchemyモデル**: `backend/app/models/`
- **最新のダンプ**: `backups/schema_only_*.sql` および `backups/full_dump_*.sql`

新しい環境のセットアップには、Alembicマイグレーションを使用してください:

```bash
cd backend
alembic upgrade head
```
