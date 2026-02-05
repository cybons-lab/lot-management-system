# Command Cheatsheet - Lot Management System

## クイックリファレンス（よく使うコマンド）

### 🚀 サービス起動/停止

```bash
npm run up              # 起動
npm run down            # 停止
npm run restart         # 再起動
npm run logs            # ログ表示
```

### 🗄️ データベース（頻出）

```bash
npm run db:shell        # 開発DBに接続 ✨一発接続
npm run db:shell:test   # テストDBに接続
npm run db:info         # DB接続情報を表示
npm run db:reset        # DBリセット
npm run db:init         # サンプルデータ投入
```

**以前の問題:**
```bash
# 何度も試行錯誤
docker compose exec ...  # コンテナ名がわからない
docker compose ps        # 確認
docker compose exec db-postgres psql ...  # 接続文字列がわからない
```

**新しい方法:**
```bash
npm run db:shell        # これだけ！
```

### 📝 型定義の更新（頻出）

```bash
npm run fe:typegen      # OpenAPI型定義を再生成 ✨自動
```

**以前の問題:**
```bash
# 毎回エラーとの戦い
cd frontend
npm run typegen         # ❌ バックエンドが見つからない
# Docker起動確認...
docker compose ps
# Makefileを探す...
make frontend-typegen
```

**新しい方法:**
```bash
npm run fe:typegen      # これだけ！（Docker経由で自動取得）
```

### ✅ コミット前の品質チェック

```bash
npm run quality         # 5分で完了（推奨）
npm run quality:full    # 10分（E2E含む）
npm run test:smoke      # 30秒（最速チェック）
```

### 🔍 個別チェック

```bash
# Lint + フォーマット
npm run lint:fix
npm run format

# 型チェック
npm run typecheck

# テスト
npm run test
npm run test:quick
npm run test:smoke
```

---

## カテゴリ別コマンド一覧

### Docker Services

| コマンド | 説明 |
|---------|------|
| `npm run up` | すべてのサービスを起動 |
| `npm run down` | すべてのサービスを停止 |
| `npm run restart` | すべてのサービスを再起動 |
| `npm run logs` | すべてのログを表示 |
| `npm run logs:backend` | バックエンドのログのみ |
| `npm run logs:frontend` | フロントエンドのログのみ |
| `npm run clean` | ボリュームを含めて完全削除 |

### Database

| コマンド | 説明 |
|---------|------|
| `npm run db:shell` | 開発DBに接続 ✨ |
| `npm run db:shell:test` | テストDBに接続 ✨NEW |
| `npm run db:info` | DB接続情報を表示 ✨NEW |
| `npm run db:reset` | DBをリセット |
| `npm run db:init` | サンプルデータを投入 |
| `npm run alembic:upgrade` | マイグレーション実行 |
| `npm run alembic:downgrade` | マイグレーションを1つ戻す |
| `npm run alembic:history` | マイグレーション履歴 |
| `npm run alembic:current` | 現在のバージョン |

### Backend (Python)

| コマンド | 説明 |
|---------|------|
| `npm run be:quality` | 品質チェック（一括） |
| `npm run be:lint` | Lintチェック |
| `npm run be:lint:fix` | Lint自動修正 |
| `npm run be:format` | コードフォーマット |
| `npm run be:typecheck` | 型チェック |
| `npm run be:test` | テスト実行 |
| `npm run be:test:quick` | 高速テスト |
| `npm run be:test:integration` | 統合テスト |
| `npm run be:shell` | Bashシェルに接続 |
| `npm run be:ci` | CI チェック（自動修正なし） |

### Frontend (TypeScript)

| コマンド | 説明 |
|---------|------|
| `npm run fe:quality` | 品質チェック（一括） |
| `npm run fe:lint` | Lintチェック |
| `npm run fe:lint:fix` | Lint自動修正 |
| `npm run fe:format` | コードフォーマット |
| `npm run fe:typecheck` | 型チェック |
| `npm run fe:typegen` | 型定義を再生成 ✨自動 |
| `npm run fe:test` | テスト実行 |
| `npm run fe:test:e2e` | E2Eテスト実行 |
| `npm run fe:test:e2e:smoke` | スモークテスト |
| `npm run fe:shell` | Shシェルに接続 |
| `npm run fe:ci` | CI チェック（自動修正なし） |

### Quality Checks (Full Stack)

| コマンド | 説明 | 実行時間 |
|---------|------|----------|
| `npm run quality` | 品質チェック（自動修正あり） | 5分 |
| `npm run quality:full` | 品質チェック + E2E | 10分 |
| `npm run test:smoke` | スモークテスト | 30秒 |
| `npm run ci` | CI チェック（自動修正なし） | 8分 |
| `npm run ci:smoke` | CI + Smoke | 9分 |
| `npm run lint:fix` | 全体Lint自動修正 | 1分 |
| `npm run format` | 全体フォーマット | 1分 |
| `npm run typecheck` | 全体型チェック | 2分 |
| `npm run test` | 全体テスト | 5分 |

### Development Workflow

| コマンド | 説明 |
|---------|------|
| `npm run dev:setup` | 初回セットアップ（起動 + DB初期化） |
| `npm run dev:reset` | 開発環境をリセット |

---

## シナリオ別コマンド

### 初回セットアップ

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd lot-management-system

# 2. 開発環境をセットアップ
npm run dev:setup

# 3. ブラウザでアクセス
# http://localhost:3000
```

### 毎日の開発開始

```bash
# サービス起動
npm run up

# DB接続確認（必要に応じて）
npm run db:shell
```

### 機能開発中

```bash
# 型定義を更新（バックエンドAPI変更後）
npm run fe:typegen

# リアルタイムテスト
cd frontend
npm run test         # Vitest watch mode
```

### コミット前

```bash
# 品質チェック（自動修正）
npm run quality

# または個別に
npm run lint:fix
npm run format
npm run typecheck
npm run test:quick
```

### PR作成前

```bash
# 完全チェック
npm run quality:full

# または
npm run ci
npm run test:smoke
```

### トラブルシューティング

```bash
# サービスが起動しない
npm run down
npm run clean        # ボリューム削除
npm run up

# DBが壊れた
npm run db:reset
npm run db:init

# 型定義がおかしい
npm run fe:typegen

# キャッシュをクリア
npm run down
npm run clean
npm run dev:setup
```

---

## よくある質問

### Q: Makefileは使えなくなりますか？
A: 移行期間中（2週間）は併用可能です。その後、Makefileは削除予定です。

### Q: Windowsでも動作しますか？
A: はい！npm scriptsは完全にクロスプラットフォーム対応です。

### Q: ローカルで直接実行したい
A: バックエンドのみ `poe` コマンドが使えます。
```bash
cd backend
poe docker:lint
poe docker:test
```

### Q: poethepoetは必須ですか？
A: バックエンド開発をする場合のみ推奨です。ルートからは`npm run`で完結します。

### Q: 古いMakefileのコマンドは？
A: [POE_MIGRATION_GUIDE.md](./POE_MIGRATION_GUIDE.md) を参照してください。

---

## 参考資料

- [Poe Migration Guide](./POE_MIGRATION_GUIDE.md) - 詳細な移行ガイド
- [Testing Quick Start](./TESTING_QUICKSTART.md) - テスト実行ガイド
- [Testing Strategy](./TESTING_STRATEGY.md) - テスト戦略
- [package.json](../../package.json) - 全タスク定義
- [backend/pyproject.toml](../../backend/pyproject.toml) - poeタスク定義
