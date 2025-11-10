# Lot Management System

材料在庫をロット単位で一元管理し、OCR で読み取った受注に対して正しいロットを引き当て、在庫不足時には自動で仮発注を起票するシステム。

## 技術スタック

### Backend
- **Framework**: FastAPI 0.115.5
- **ORM**: SQLAlchemy 2.0.36
- **Validation**: Pydantic 2.10.1
- **Database**: PostgreSQL/MySQL (本番), SQLite (開発)

### Frontend
- **Framework**: React 19
- **State**: Jotai, TanStack Query
- **UI**: Radix UI, Tailwind CSS, shadcn
- **Type**: TypeScript (strict mode)

## セットアップ

詳細は各ディレクトリの README を参照：
- [Backend README](./backend/README.md)

## コード品質チェック

### Backend (Python)

```bash
cd backend

# Lint チェック
ruff check app/

# 自動修正
ruff check app/ --fix

# フォーマット
ruff format app/

# CI チェック
ruff check app/ && ruff format --check app/
```

### Frontend (TypeScript)

```bash
cd frontend

# 型チェック
npm run typecheck

# Lint チェック
npm run lint

# 自動修正
npm run lint:fix

# フォーマット
npm run format

# CI チェック
npm run typecheck && npm run lint && npm run format:check
```

## プロジェクト構造

```
.
├── backend/          # FastAPI バックエンド
│   ├── app/
│   │   ├── api/      # API ルーター層
│   │   ├── services/ # ビジネスロジック層
│   │   ├── repositories/ # データアクセス層
│   │   ├── models/   # SQLAlchemy モデル層
│   │   ├── schemas/  # Pydantic スキーマ層
│   │   └── domain/   # ドメインロジック層
│   └── alembic/      # DB マイグレーション
│
├── frontend/         # React フロントエンド
│   ├── src/
│   │   ├── features/ # 機能別コンポーネント
│   │   ├── components/ # 共有コンポーネント
│   │   ├── hooks/    # カスタムフック
│   │   └── types/    # 型定義 (OpenAPI 生成)
│   └── package.json
│
└── docs/             # ドキュメント
    └── architecture/ # アーキテクチャ設計書
```

## バックエンド命名規約

バックエンドのファイル命名は、役割を即座に識別できるよう標準化されています。

### ファイル命名ルール

| 役割 | 命名パターン | 例 |
|-----|------------|-----|
| ルータ | `*_router.py` | `orders_router.py`, `admin_router.py` |
| サービス | `*_service.py` | `order_service.py`, `allocation_service.py` |
| リポジトリ | `*_repository.py` | `order_repository.py`, `stock_repository.py` |
| スキーマ | `*_schema.py` | `orders_schema.py`, `admin_schema.py` |
| モデル | `*_models.py` | `orders_models.py`, `inventory_models.py` |
| 設定/起動 | 単機能名 | `config.py`, `database.py`, `logging.py` |

### ドメインプレフィックス

- `admin_*`: 管理機能
- `masters_*`: マスタ管理
- `orders_*`: 受注管理
- `inventory_*`: 在庫管理
- `allocations_*`: 引当管理

### OpenAPI スキーマ検証

リネーム後も公開APIに変更がないことを確認できます：

```bash
cd backend

# ベースラインを生成（リネーム前）
python openapi_diff_check.py generate baseline_openapi.json

# リネーム実施後、差分をチェック
python openapi_diff_check.py generate current_openapi.json
python openapi_diff_check.py compare baseline_openapi.json current_openapi.json
```

差分がある場合は終了コード1を返します。CI/CDパイプラインで使用可能です。

### 詳細情報

- リネームマッピング表: [RENAME_MAPPING.md](./RENAME_MAPPING.md)
- OpenAPI検証スクリプト: [backend/openapi_diff_check.py](./backend/openapi_diff_check.py)

## ドキュメント

- [Backend README](./backend/README.md)
- [データベーススキーマ](./docs/schema/)
- [アーキテクチャ設計](./docs/architecture/) (Phase 6 で追加予定)
