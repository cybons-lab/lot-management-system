# Contributing to Lot Management System

このプロジェクトへのコントリビューションに興味を持っていただきありがとうございます！

## 開発フロー

### バックエンド変更時のワークフロー

バックエンドのAPIを変更した場合、以下の手順でフロントエンドの型定義を更新してください：

```bash
# 1. バックエンドで変更を実装（FastAPIのエンドポイント、Pydanticモデルなど）

# 2. OpenAPIスキーマを再生成
cd backend
python scripts/export_openapi.py

# 3. フロントエンドの型定義を更新
cd ../frontend
npm run typegen

# 4. 型エラーを確認
npm run typecheck

# 5. 必要に応じてフロントエンドコードを修正

# 6. コミット
git add .
git commit -m "feat: update API schema and regenerate types"
```

### 型定義の管理

**重要**: このプロジェクトでは、バックエンドのOpenAPI定義を**Single Source of Truth**とし、フロントエンドの型定義は自動生成されます。

- ✅ **DO**: バックエンドでPydanticモデルを定義し、OpenAPIスキーマを生成
- ✅ **DO**: フロントエンドでは生成された型（`components["schemas"]["..."]`）を使用
- ❌ **DON'T**: フロントエンドで手動で型定義を作成・管理

#### フロントエンドで型を使う

```typescript
// ✅ Good: 生成された型を使用
import type { CandidateLotItem } from '@/shared/types/schema';

// ❌ Bad: 手動で型を定義
interface LotCandidate {
  lot_id: number;
  // ...
}
```

エイリアスが必要な場合は `src/shared/types/schema.ts` に追加：

```typescript
// src/shared/types/schema.ts
import type { components } from './openapi';

export type CandidateLotItem = components['schemas']['CandidateLotItem'];
```

## 依存関係管理

### バックエンド（Python）

このプロジェクトでは `uv` を使用して依存関係を管理しています。

```bash
# 依存関係のインストール
uv sync

# 開発依存も含めてインストール
uv sync --all-extras --dev

# パッケージの追加
uv add <package-name>

# 開発依存の追加
uv add --dev <package-name>
```

### フロントエンド（Node.js）

npm を使用しています。

```bash
# 依存関係のインストール
npm ci

# パッケージの追加
npm install <package-name>

# 開発依存の追加
npm install --save-dev <package-name>
```

## コード品質

### フロントエンド

```bash
# TypeScript型チェック
npm run typecheck

# ESLintチェック
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettierフォーマット
npm run format

# Prettierチェック
npm run format:check
```

### バックエンド

```bash
# Ruffフォーマット
uv run ruff format app/

# Ruff lintチェック
uv run ruff check app/

# Ruff自動修正
uv run ruff check --fix app/

# pytest実行
uv run pytest
```

## コミット前チェックリスト

プルリクエストを作成する前に、以下を確認してください：

- [ ] TypeScript型チェックが通る（`npm run typecheck`）
- [ ] ESLintエラーがない（`npm run lint`）
- [ ] Prettierフォーマットが適用されている（`npm run format`）
- [ ] バックエンドAPIを変更した場合、OpenAPIスキーマを再生成している
- [ ] フロントエンドの型定義が最新（`npm run typegen`実行済み）
- [ ] テストが通る（該当する場合）

## ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境（使用していない場合は`main`に直接）
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `refactor/*`: リファクタリング
- `docs/*`: ドキュメントのみの変更

## プルリクエスト

1. 適切なブランチ名でブランチを作成
2. 変更を実装し、コミット
3. プッシュしてプルリクエストを作成
4. CI/CDチェックが通ることを確認
5. レビューを待つ

## ヘルプ

質問がある場合は、Issueを作成するか、プロジェクト管理者に連絡してください。
