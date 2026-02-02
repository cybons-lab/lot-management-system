# Lot Management System

材料在庫をロット単位で一元管理し、OCR で読み取った受注に対して正しいロットを引き当て、在庫不足時には自動で仮発注を起票するシステム。

## 技術スタック

### Backend
- **Framework**: FastAPI 0.115.5
- **ORM**: SQLAlchemy 2.0.36
- **Validation**: Pydantic 2.10.1
- **Database**: PostgreSQL 15

### Frontend
- **Framework**: React 19
- **State**: Jotai, TanStack Query
- **UI**: Radix UI, Tailwind CSS, shadcn
- **Type**: TypeScript (strict mode)

---

## セットアップ

### クイックスタート（推奨）

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd lot-management-system

# 2. Docker Composeで環境を起動
make dev-setup

# 3. ブラウザでアクセス
# フロントエンド: http://localhost:5173
# バックエンドAPI: http://localhost:8000/api/docs
```

詳細は各ディレクトリの README を参照：
- [Backend README](./backend/README.md)

---

## 開発ワークフロー（Docker統一）

**すべての開発コマンドはDocker経由で実行します。** Makefileを使用して統一されたワークフローを実現しています。

### 基本コマンド

```bash
# サービス起動/停止
make up          # すべてのサービスを起動
make down        # すべてのサービスを停止
make restart     # すべてのサービスを再起動
make logs        # すべてのログを表示

# 開発環境セットアップ
make dev-setup   # 起動 + サンプルデータ投入
```

### コード品質チェック

```bash
# 全体の品質チェック（コミット前に推奨）
make quality-check   # Lint修正 + Format + Type check + Test

# CI相当のチェック（自動修正なし）
make ci

# 個別実行
make lint            # 全体Lint
make lint-fix        # 全体Lint自動修正
make format          # 全体フォーマット
make typecheck       # 全体型チェック
make test            # 全体テスト
```

### Backend (Python)

```bash
# 品質チェック
make backend-lint           # Lintチェック
make backend-lint-fix       # Lint自動修正
make backend-format         # コードフォーマット
make backend-test           # テスト実行

# または docker compose 直接
docker compose exec backend ruff check app/
docker compose exec backend ruff format app/
docker compose exec backend pytest -v
```

### Frontend (TypeScript)

```bash
# 品質チェック
make frontend-lint          # Lintチェック
make frontend-lint-fix      # Lint自動修正
make frontend-format        # コードフォーマット
make frontend-typecheck     # 型チェック
make frontend-typegen       # OpenAPI型定義を再生成

# または docker compose 直接
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run typegen:curl
```

### データベース操作

```bash
make db-reset          # データベースをリセット
make db-init-sample    # サンプルデータを投入
make alembic-upgrade   # マイグレーション実行
```

### デプロイパッケージのビルド

```bash
# 本番デプロイパッケージを作成（高速ビルド）
make build

# クリーンビルド（node_modules を再インストール）
make build-clean

# 出力: deploy/lot-management-deploy-YYYYMMDD.zip
```

**ビルドプロセス:**
1. フロントエンドをビルド（Docker経由）
2. バックエンドをコピー（Python依存関係を含む）
3. `requirements.txt` を自動生成
4. ドキュメントをコピー
5. ZIPファイルにパッケージング

### その他のコマンド

```bash
make help              # すべてのコマンドを表示
make backend-shell     # バックエンドコンテナにシェルでログイン
make frontend-shell    # フロントエンドコンテナにシェルでログイン
```

---

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

---

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
# ベースラインを生成（リネーム前）
make backend-shell
python scripts/openapi_diff_check.py generate baseline_openapi.json

# リネーム実施後、差分をチェック
python scripts/openapi_diff_check.py generate current_openapi.json
python scripts/openapi_diff_check.py compare baseline_openapi.json current_openapi.json
```

差分がある場合は終了コード1を返します。CI/CDパイプラインで使用可能です。

---

## 📚 ドキュメント

### 主要ドキュメント
- [CLAUDE.md](./CLAUDE.md) - AI開発アシスタント向けプロジェクトガイド
- [業務用語集 (Glossary)](docs/glossary.md) - 業務固有の用語解説
- [残課題 (Remaining Issues)](docs/remaining_issues.adoc) - 主要な残課題とTODO
- [予測データ (Forecast)](docs/forecast.adoc) - 予測データの仕様と実装
- [引当処理 (Allocation)](docs/allocation.adoc) - ロット引当の仕様とUI改善

### 実装ドキュメント
- [SAP連携実装 Walkthrough](docs/implementation/sap-inbound-walkthrough.md) - Phase 1-3完全実装の記録
- [SAP連携 CHANGELOG](docs/CHANGELOG_sap_inbound.md) - SAP連携の変更履歴

### 機能設計
- [ユーザー-仕入先担当割り当て](docs/features/user-supplier-assignments.md) - 担当割り当て機能の設計

### データベース
- [スキーマ改善計画](docs/database/schema-improvements-plan.md) - SAP商品マスタ対応を含む包括的改善計画
- [ER図](docs/er_diagram.md) - データベース構造図

### アーカイブ
- [過去のドキュメント](docs/archive/) - アーカイブされた改善提案・仕様書
