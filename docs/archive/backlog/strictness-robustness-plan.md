# 設定の厳密化・堅牢性強化計画

## スコープ
設定ファイルの厳密化、依存関係の整理、静的解析の強化。
asyncpg移行は別PRでBACKLOGに追加。

---

## 1. Backend `pyproject.toml` 依存関係整理

### 1-1. 本番依存から削除（推移的依存・未使用）
以下を `[project].dependencies` から削除:
- `anyio` (FastAPI/Starletteが管理)
- `pycparser` (cryptographyが管理)
- `certifi` (httpxが管理)
- `greenlet` (SQLAlchemyが管理)
- `numpy` (pandasが管理)
- `packaging` (ビルドツール)
- `pyasn1` (python-joseが管理→jose削除で不要)
- `pathspec` (ruffが管理→ruff削除で不要)
- `tzdata` (pandasが管理)
- `websockets` (uvicornが管理)
- `librt` (未使用・インポートなし)

### 1-2. dev依存へ移動
- `ruff` → dev groupのみに（prod側を削除、dev側のバージョンを `>=0.15.0` に統一）
- `hypothesis` → dev groupのみに（prod側を削除）
- `requests` → dev groupに移動（scripts/のみで使用）

### 1-3. optional-dependenciesへ分離
```toml
[project.optional-dependencies]
seed = ["faker>=40.4.0"]
export = ["pandas>=3.0.0", "openpyxl>=3.1.0", "reportlab>=4.4.9"]
```
- `faker` を seed グループへ
- `pandas`, `openpyxl`, `reportlab` を export グループへ
- Dockerfile で `pip install .[seed,export]` にする

### 1-4. 重複ライブラリ統一
- **JWT:** `python-jose[cryptography]` を削除 → `PyJWT` に統一
  - `tests/test_auth.py` の `from jose import jwt` を `import jwt` (PyJWT) に変更
  - dev groupから `types-python-jose` も削除
- **HTTP:** `requests` を dev group へ移動（scripts/でのみ使用）
  - dev groupの `types-requests` はそのまま
- **Logging:** `python-json-logger` を削除 → `structlog` に統一（インポートなし確認済み）

### 1-5. セキュリティ改善
- `cryptography` のフロア設定: `cryptography>=43.0.0,<47.0.0`

### 1-6. build-system追加
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.backends"
```

---

## 2. Backend Ruff設定強化

### 2-1. ルール追加
```toml
select = [
  "E", "F", "I", "D", "UP", "B",  # 既存
  "SIM",   # コード簡略化
  "RET",   # 不要なreturn検知
  "C4",    # 内包表記の最適化
  "PERF",  # パフォーマンス
  "TRY",   # 例外処理パターン
  "RUF",   # ruff独自ルール
  "S",     # セキュリティ (Bandit相当)
  "LOG",   # ロギングパターン
  "T20",   # print()残留禁止
  "ERA",   # コメントアウトコード禁止
  "ARG",   # 未使用引数検知
  "C90",   # 複雑度チェック
  "PL",    # Pylint互換
]
```

### 2-2. ignore更新
- `B904` を ignoreから削除（raise-without-from を有効化）
- 新規追加ルールで必要なignoreを追加:
  - `TRY003` (長いexceptionメッセージ - FastAPIでは一般的)
  - `S101` (assert使用 - テストでは必要)
  - `PLR0913` (引数多すぎ - サービス層で一般的)
  - `PLR2004` (マジックナンバー - 段階的対応)

### 2-3. per-file-ignores拡張
```toml
[tool.ruff.lint.per-file-ignores]
"tests/**" = ["D", "S101", "ARG", "PLR2004"]
"alembic/**" = ["D", "F401"]
"scripts/**" = ["T20", "S"]
```

### 2-4. mccabe複雑度設定
```toml
[tool.ruff.lint.mccabe]
max-complexity = 10
```

### 2-5. format設定明示
```toml
[tool.ruff.format]
quote-style = "double"
docstring-code-format = true
```

---

## 3. Backend Mypy厳密化

```toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
warn_unused_ignores = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
no_implicit_optional = true
plugins = ["sqlalchemy.ext.mypy.plugin"]

[[tool.mypy.overrides]]
module = ["reportlab.*", "pandas.*", "openpyxl.*"]
ignore_missing_imports = true
```

---

## 4. Backend pytest設定統合

`pytest.ini` を削除し、`pyproject.toml` に統合:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --strict-markers --tb=short"
asyncio_mode = "auto"
filterwarnings = [
    "error",
    "ignore::DeprecationWarning:sqlalchemy.*",
    "ignore::UserWarning:sqlalchemy.*",
]
markers = [
    "integration: integration tests",
    "slow: slow tests",
]
```

---

## 5. CLAUDE.md Python版修正

CLAUDE.mdの「Python 3.13」記述を「Python 3.12」に修正。

---

## 6. Frontend `package.json` 依存整理

### 6-1. dependencies → devDependencies へ移動
- `@playwright/test`
- `@types/dagre`

### 6-2. 重複パッケージ削除
- `playwright` を devDependencies から削除
- `@typescript-eslint/eslint-plugin` を削除
- `@typescript-eslint/parser` を削除

### 6-3. 不要パッケージ削除
- `autoprefixer`, `postcss` → Tailwind v4 Viteプラグインで不要

### 6-4. 新規追加
- `@vitest/coverage-v8` (devDependencies)
- `knip` (devDependencies)
- `@tanstack/eslint-plugin-query` (devDependencies)

---

## 7. Frontend `tsconfig.json` 厳密化

追加設定:
- `noUncheckedIndexedAccess: true`
- `forceConsistentCasingInFileNames: true`
- `exactOptionalPropertyTypes: true` (エラー多ければ後回し)

---

## 8. Frontend `vitest.config.ts` 改善

- `clearMocks: true`
- `restoreMocks: true`
- coverage設定追加 (provider: v8)

---

## 9. Frontend `vite.config.ts` 改善

- `optimizeDeps.include` から `d3`, `dagre-d3` を削除
- `build.sourcemap: "hidden"` を追加

---

## 10. knip 設定

`frontend/knip.json` を新規作成。
`package.json` にスクリプト追加。

---

## 11. BACKLOG追加

- asyncpg移行
- eslint-plugin-import → eslint-plugin-import-x 移行
- ESLint `no-explicit-any` の段階的有効化
- Vite manual chunks 最適化

---

## 修正対象ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `backend/pyproject.toml` | 依存整理, ruff強化, mypy厳密化, pytest統合, build-system追加 |
| `backend/pytest.ini` | 削除 |
| `backend/tests/test_auth.py` | python-jose → PyJWT import変更 |
| `frontend/package.json` | 依存移動/削除/追加 |
| `frontend/tsconfig.json` | strict設定追加 |
| `frontend/vitest.config.ts` | coverage/mock設定追加 |
| `frontend/vite.config.ts` | optimizeDeps修正, sourcemap追加 |
| `frontend/knip.json` | 新規作成 |
| `CLAUDE.md` | Python 3.13 → 3.12 修正 |
| `docs/project/BACKLOG.md` | asyncpg等の将来タスク追加 |

---

## 完了状況

### Phase 1（PR #557 でマージ済み）
- [x] 1. Backend `pyproject.toml` 依存関係整理
- [x] 2. Backend Ruff設定強化
- [x] 3. Backend Mypy厳密化
- [x] 4. Backend pytest設定統合
- [x] 5. CLAUDE.md Python版修正
- [x] 6. Frontend `package.json` 依存整理
- [x] 7. Frontend `tsconfig.json` 厳密化（forceConsistentCasingInFileNames）
- [x] 8. Frontend `vitest.config.ts` 改善
- [x] 9. Frontend `vite.config.ts` 改善（optimizeDeps, sourcemap）
- [x] 10. knip設定
- [x] 11. BACKLOG追加

### Phase 1-A/C（PR #558 でマージ済み）
- [x] ESLint設定強化・DataTableリファクタリング
- [x] ESLint Temporary overrides 削減（116 → 44ファイル）

### Phase 後続（BACKLOG 3-0, feature/backlog-1a-strictness-robustness ブランチ）
- [x] eslint-plugin-import → eslint-plugin-import-x 移行
- [x] ESLint `no-explicit-any` 段階的有効化（off → warn）
- [x] Vite manual chunks 最適化
- [x] `exactOptionalPropertyTypes: true` 追加
- [x] `noUncheckedIndexedAccess: true` 追加
- [x] requests → httpx 統一（SmartReadサービス全体）
- [ ] asyncpg移行（別PR予定、高難易度）
- [x] mypy `no-any-return` エラー4件（simple_sync_service.py）- 型アノテーション追加で解消

---

## 検証手順

1. `npm run up` でDockerコンテナ起動
2. `npm run be:quality` でバックエンド品質チェック
3. `npm run fe:quality` でフロントエンド品質チェック
4. `npm run test` で全テスト通過確認
5. ruff / mypy の新ルールでエラーが出た場合は段階的に対応
6. `npx knip` でデッドコード検出結果確認
