---
description: PR作成前のCIチェック（Lint/Test/Build）
---

# PR作成前のCIチェック

PRを作成する前に、以下の手順でローカル環境にてCIチェックを実行してください。これにより、Push後のCIエラーを防ぐことができます。

## 1. 依存関係のインストール（必要な場合）

```bash
# フロントエンド
cd frontend
npm ci

# バックエンド
# ルートディレクトリで実行
uv sync
```

## 2. フロントエンドのチェック

```bash
cd frontend

# 1. 型定義の生成（最初に行う！）
npm run typegen:full

# 2. コードフォーマット
npm run format

# 3. TypeScriptの型チェック
npm run typecheck

# 4. Lint (ESLint) の実行
npm run lint
```

## 3. バックエンドのチェック

```bash
# ルートディレクトリからbackendへ移動
cd backend

# フォーマッター (Ruff) のチェック
uv run ruff format --check app/

# Linter (Ruff) のチェック
uv run ruff check app/

# 型チェック (Mypy)
uv run mypy app/
```

## 4. 全体チェック用コマンド (Turbo)

// turbo
```bash
# Frontend (Typegen first!) -> Format -> Typecheck -> Lint
cd frontend && npm run typegen:full && npm run format && npm run typecheck && npm run lint

# Backend Format & Lint & Typecheck
cd backend && uv run ruff format --check app/ && uv run ruff check app/ && uv run mypy app/
```
