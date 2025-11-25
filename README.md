# Lot Management System

材料在庫をロット単位で一元管理し、OCR で読み取った受注に対して正しいロットを引き当て、在庫不足時には自動で仮発注を起票するシステム。

## ドキュメント

### ガイド
- **[プロジェクトガイド](./docs/PROJECT_GUIDE.md)**: 開発ルール、アーキテクチャ詳細、運用フローなど（旧 CLAUDE.md）
- **[セットアップガイド](./SETUP_GUIDE.md)**: 環境構築手順

### コンポーネント
- **[Backend README](./backend/README.md)**: API、DB、バックエンド開発
- **[Frontend README](./frontend/README.md)**: UI/UX、フロントエンド開発

### 詳細資料
- **[docs/](./docs/)**: ドキュメントルート
  - **[architecture/](./docs/architecture/)**: アーキテクチャ設計
  - **[schema/](./docs/schema/)**: データベーススキーマ定義
  - **[reports/](./docs/reports/)**: 調査レポート、整合性チェック結果
  - **[planning/](./docs/planning/)**: リファクタリング計画、機能追加計画

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

## コード品質チェック

### Backend (Python)

```bash
cd backend
ruff check app/ && ruff format --check app/
```

### Frontend (TypeScript)

```bash
cd frontend
npm run typecheck && npm run lint && npm run format:check
```

## プロジェクト構造

```
.
├── backend/          # FastAPI バックエンド
├── frontend/         # React フロントエンド
├── docs/             # ドキュメント
├── tools/            # ユーティリティスクリプト
├── backups/          # バックアップ・アーカイブ
├── README.md         # このファイル
└── SETUP_GUIDE.md    # セットアップ手順
```

