# テスト資産カタログ

本ドキュメントは、現時点のテスト資産・実行手段・対象領域を横断的に把握するための一覧です。
テスト件数などの数値は変動するため、ここでは種別・配置・目的に焦点を当てます。

## 1. Backend (FastAPI/Python)

### 1.1 pytest テストスイート
- **配置**: `backend/tests/`
- **フレームワーク**: `pytest` (設定は `backend/pytest.ini`)
- **主な種別**:
  - API 結合テスト
  - サービス/リポジトリ単位のテスト
  - ドメイン/ロジック単体テスト

**実行例**:
```bash
cd backend
pytest
```

### 1.2 テスト支援スクリプト
`backend/scripts/` には、特定機能の検証や回帰チェックに使う補助スクリプトが含まれます。
- 例: API スモーク検証 (`run_api_smoke.py`)
- 例: テストデータ生成 (`generate_test_data.py`)

これらは pytest とは独立して実行するユーティリティであり、回帰確認や手動検証を補完します。

---

## 2. Frontend (React/TypeScript)

### 2.1 ユニット・コンポーネントテスト
- **配置**: `frontend/src/**/*.test.ts(x)`
- **フレームワーク**: `vitest` + Testing Library
- **主な対象**:
  - UI コンポーネント
  - hooks
  - ユーティリティ関数

**実行例**:
```bash
cd frontend
npm test
```

### 2.2 E2E テスト (Playwright)
- **配置**: `frontend/e2e/`
- **フレームワーク**: Playwright
- **主な対象**:
  - 主要画面の動線・CRUD
  - 認証フロー
  - エクスポート/ダウンロード

**実行例**:
```bash
cd frontend
npx playwright test
```

---

## 3. 補足

- テスト観点や重点領域の整理は [テスト戦略](test_strategy.md) を参照してください。
- 既存テストの詳細調査時は、`backend/tests/` と `frontend/src/` のテストファイルを起点に確認すると効率的です。
