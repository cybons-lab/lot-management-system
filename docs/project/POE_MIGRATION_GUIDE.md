# Poe the Poet Migration Guide

## 概要

**Makefile → poethepoet (poe) + npm scripts** への統一移行ガイド。

**移行理由:**
1. **Windows互換性**: Makefileは Windows で動作しないが、poe/npm は全プラットフォーム対応
2. **統一されたタスク管理**: Python (poe) と Node.js (npm) を同じインターフェースで実行
3. **ローカル/Docker の明確な分離**: 混乱を避けるため、すべてDocker経由に統一

---

## 新しいコマンド体系

### 3つの実行方法

```bash
# 1. ルートレベル (推奨) - npm scripts
npm run <task>

# 2. バックエンド - poe (Python環境)
cd backend && poe docker:<task>

# 3. フロントエンド - npm scripts
cd frontend && npm run docker:<task>
```

---

## コマンド対応表

### サービス操作

| Makefile (旧) | npm scripts (新) | 説明 |
|--------------|-----------------|------|
| `make up` | `npm run up` | サービス起動 |
| `make down` | `npm run down` | サービス停止 |
| `make restart` | `npm run restart` | 再起動 |
| `make logs` | `npm run logs` | ログ表示 |

### データベース

| Makefile (旧) | npm scripts (新) | 説明 |
|--------------|-----------------|------|
| `make db-shell` | `npm run db:shell` | 開発DB接続 |
| N/A | `npm run db:shell:test` | テストDB接続 ✨NEW |
| `make db-reset` | `npm run db:reset` | DB リセット |
| `make db-init-sample` | `npm run db:init` | サンプルデータ投入 |
| N/A | `npm run db:info` | DB接続情報表示 ✨NEW |

### バックエンド

| Makefile (旧) | npm scripts (新) | poe (新) | 説明 |
|--------------|-----------------|----------|------|
| `make backend-lint` | `npm run be:lint` | `poe docker:lint` | Lint |
| `make backend-lint-fix` | `npm run be:lint:fix` | `poe docker:lint:fix` | Lint修正 |
| `make backend-format` | `npm run be:format` | `poe docker:format` | フォーマット |
| `make backend-typecheck` | `npm run be:typecheck` | `poe docker:typecheck` | 型チェック |
| `make backend-test` | `npm run be:test` | `poe docker:test` | テスト |
| `make backend-test-quick` | `npm run be:test:quick` | `poe docker:test:quick` | 高速テスト |
| N/A | `npm run be:test:integration` | `poe docker:test:integration` | 統合テスト ✨NEW |

### フロントエンド

| Makefile (旧) | npm scripts (新) | 説明 |
|--------------|-----------------|------|
| `make frontend-lint` | `npm run fe:lint` | Lint |
| `make frontend-lint-fix` | `npm run fe:lint:fix` | Lint修正 |
| `make frontend-format` | `npm run fe:format` | フォーマット |
| `make frontend-typecheck` | `npm run fe:typecheck` | 型チェック |
| `make frontend-typegen` | `npm run fe:typegen` | 型定義生成 |
| `make frontend-test` | `npm run fe:test` | テスト |
| `make frontend-test-e2e-smoke` | `npm run fe:test:e2e:smoke` | スモークテスト |

### 品質チェック（全体）

| Makefile (旧) | npm scripts (新) | 説明 |
|--------------|-----------------|------|
| `make quality-check` | `npm run quality` | 品質チェック（5分） |
| `make quality-check-full` | `npm run quality:full` | 完全チェック（10分） |
| `make test-smoke` | `npm run test:smoke` | スモークテスト（30秒） |
| `make ci` | `npm run ci` | CI チェック |
| `make ci-smoke` | `npm run ci:smoke` | CI + Smoke |

---

## 推奨ワークフロー

### 毎日の開発

```bash
# 起動
npm run up

# DB接続確認（開発DB）
npm run db:shell
# \q で終了

# テストDBの確認
npm run db:shell:test
# \q で終了

# DB接続情報を表示
npm run db:info
```

### コミット前

```bash
# 品質チェック（自動修正 + テスト）
npm run quality

# または手動で
npm run lint:fix
npm run format
npm run typecheck
npm run test:quick
```

### PR作成時

```bash
# 完全チェック（E2E含む）
npm run quality:full
```

### 型定義の更新（頻出）

```bash
# バックエンド起動確認不要！
# 自動でlocalhost:8000から取得
npm run fe:typegen
```

**以前の問題:**
- ローカルで `npm run typegen` → 失敗
- Docker起動確認 → `docker compose ps`
- Makefile確認 → `make frontend-typegen`

**新しい方法:**
- `npm run fe:typegen` で一発実行 ✅

---

## 詳細なタスク例

### データベース操作

```bash
# 開発DBに接続（即座に接続）
npm run db:shell

# テストDBに接続（即座に接続）
npm run db:shell:test

# DB接続情報を確認
npm run db:info

# DBをリセット（ボリューム削除 + 再起動）
npm run db:reset

# サンプルデータ投入
npm run db:init
```

### バックエンド開発

```bash
# Lint + フォーマット + 型チェック + テスト（一括）
npm run be:quality

# 個別実行
npm run be:lint:fix
npm run be:format
npm run be:typecheck
npm run be:test

# 統合テストのみ実行
npm run be:test:integration

# シェルに入る
npm run be:shell
```

### フロントエンド開発

```bash
# 品質チェック（一括）
npm run fe:quality

# 型定義を再生成
npm run fe:typegen

# E2Eテスト
npm run fe:test:e2e:smoke
```

---

## poe コマンド（バックエンド専用）

バックエンドディレクトリ内で直接使用可能:

```bash
cd backend

# Dockerタスク
poe docker:lint
poe docker:test
poe docker:db-shell      # 開発DB接続
poe docker:db-test       # テストDB接続

# 複合タスク
poe docker:quality       # 全品質チェック
poe docker:ci            # CI相当

# Alembic
poe docker:alembic:upgrade
poe docker:alembic:downgrade

# 利用可能なタスク一覧
poe --help
```

---

## トラブルシューティング

### Q1: `npm run <task>` が動かない
**A:** ルートディレクトリで実行してください。

```bash
# NG
cd backend
npm run be:lint

# OK
cd /path/to/lot-management-system
npm run be:lint
```

### Q2: DB接続で `docker compose` が見つからない
**A:** Docker Desktopが起動しているか確認してください。

```bash
docker compose ps
```

### Q3: typegenが失敗する
**A:** バックエンドが起動しているか確認してください。

```bash
npm run up
# 10秒待つ
npm run fe:typegen
```

### Q4: Windowsで動作しない
**A:** npm scriptsは完全にクロスプラットフォーム対応です。PowerShell/CMD/Git Bashのいずれでも動作します。

```powershell
# PowerShell
npm run quality

# CMD
npm run quality

# Git Bash
npm run quality
```

---

## Makefile との共存期間

**移行期間中（2週間）は Makefile と npm scripts を併用可能です。**

```bash
# 旧
make quality-check

# 新（推奨）
npm run quality
```

---

## 移行完了後

- `Makefile` を削除（または `Makefile.legacy` にリネーム）
- `.github/workflows/ci.yml` を npm scripts に更新
- `CLAUDE.md` / `README.md` のコマンド例を更新

---

## 参考資料

- [poethepoet Documentation](https://poethepoet.natn.io/)
- [npm scripts Documentation](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [package.json](../../package.json) - 全タスク定義
- [backend/pyproject.toml](../../backend/pyproject.toml) - poeタスク定義
