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

# コードフォーマットの適用（これ重要！）
npm run format

# TypeScriptの型チェック
npm run typecheck

# Lint (ESLint) の実行
npm run lint

# 型定義の更新と確認 (重要！バックエンドの変更を反映)
npm run typegen:full
# git diff で差分がないことを確認してください（差分があればコミットが必要です）


# テストの実行（関連ファイルのみ実行する場合はこれ）
npm test

# 全テスト実行（念のため）
# npm run test:all
```

## 3. バックエンドのチェック

```bash
# ルートディレクトリからbackendへ移動
cd backend

# フォーマッター (Ruff) のチェック
uv run ruff format --check app/
# 自動修正したい場合は: uv run ruff format app/

# Linter (Ruff) のチェック
uv run ruff check app/
# 自動修正したい場合は: uv run ruff check --fix app/

# テストの実行
# uv run pytest

# 型チェック (Mypy)
uv run mypy app/
```

## 4. 全体チェック用コマンド (Turbo)

// turbo
```bash
# Frontend Format & Typecheck & Lint & Typegen
cd frontend && npm run format && npm run typegen:full && npm run typecheck && npm run lint

# Backend Format & Lint & Typecheck
cd backend && uv run ruff format --check app/ && uv run ruff check app/ && uv run mypy app/
```
