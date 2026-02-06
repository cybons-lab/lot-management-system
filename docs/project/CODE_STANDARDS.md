# コード品質基準

プロジェクト全体で遵守すべきコード品質基準を定義します。

## バックエンド（Python）

### 品質要件（STRICT）

- **ファイルサイズ**: < 300行
- **循環的複雑度**: < 10
- **型ヒント**: 全関数に必須
- **Docstrings**: public APIに必須（Google style）

### コマンド

```bash
# Docker経由（推奨）
npm run be:lint
npm run be:format
npm run be:typecheck
npm run be:test

# または直接
cd backend && ruff check app/ --fix && ruff format app/
```

### 命名規則

- ファイル: `*_router.py`, `*_service.py`, `*_repository.py`
- インポート: 絶対インポートのみ `from app.services.order_service import OrderService`

### トランザクション管理

- **デフォルト**: `auto_commit=True` (Simple CRUD)
- **Unit of Work**: `auto_commit=False` (複数サービスにまたがる操作)
- **Partial Failure**: `db.begin_nested()` でsavepoint作成
- **Locking**: `acquire_lock` (SELECT FOR UPDATE)

### データ整合性

- **精度**: `Decimal` 使用（float禁止）
- **バリデーション**: Fail fast（silent fallback禁止）

### APIルーター

```python
# ✅ GOOD: 末尾スラッシュなし
@router.get("")
def get_items():
    ...

# ❌ BAD: FastAPIがリダイレクト → Docker内部hostname露出
@router.get("/")
def get_items():
    ...
```

## フロントエンド（TypeScript）

### 品質要件（STRICT）

- **TypeScript**: Strict mode, 0 errors
- **ESLint**: 0 warnings
- **ファイルサイズ**: < 300行（論理的まとまり優先）
- **Sub-routing**: タブ/サブビューは必ずsub-routing使用

### コマンド

```bash
npm run fe:typecheck
npm run fe:lint
npm run fe:format
```

### 命名規則

- コンポーネント: `PascalCase.tsx`
- その他: `kebab-case.ts`
- フック: `useCamelCase`
- `@/` alias使用

## 共通規則

### DO（必須）

1. 命名規則厳守
2. 絶対インポート使用（backend）
3. **コミット前の品質チェック**: `npm run quality`
4. **バックエンド変更後の型生成**: `npm run fe:typegen`
5. 新機能にはテスト作成
6. ドメインロジックはdocstring記載
7. 頻繁にアトミックコミット
8. 機能ブランチ作成
9. **最初から包括的ログ追加**
10. **全タブ/サブビューにsub-routing使用**
11. **Docker経由でコマンド実行**

### DON'T（禁止）

1. サービス層のバイパス
2. 循環依存
3. 品質チェック無しコミット
4. コンポーネントにビジネスロジック混入
5. TypeScriptで `any` 使用
6. 設定値のハードコード
7. ログなしコード

## 詳細ドキュメント

- [ログガイドライン](./LOGGING_GUIDELINES.md)
- [エラーハンドリング](./ERROR_HANDLING.md)
- [アクセス制御](./ACCESS_CONTROL.md)
