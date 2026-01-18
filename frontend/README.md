# Frontend

フロントエンドの詳細なセットアップ手順とドキュメントは以下を参照してください:

- [フロントエンドセットアップガイド](../docs/dev/frontend-setup.md)
- [フロントエンドスタイルガイド](../docs/standards/frontend-style-guide.md)
- [アーキテクチャ概要](../docs/architecture/frontend.md)

## クイックスタート

```bash
# Docker Composeで起動
docker compose up

# または、ローカルで起動
cd frontend
npm install
npm run dev

# ブラウザで開く
open http://localhost:5173
```

## 開発コマンド

```bash
# 型チェック
npm run typecheck

# Lint
npm run lint

# フォーマット
npm run format

# OpenAPI型生成
npm run typegen
```
