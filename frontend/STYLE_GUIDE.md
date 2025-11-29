# Frontend Style Guide

このドキュメントは、フロントエンドコードの構造、命名規則、ベストプラクティスを定義します。

## フォルダ構成

### Feature構成（標準）

各featureは以下の構造に従います：

```
features/{feature-name}/
├── api.ts              # API層（型定義 + Bulk操作など）
├── hooks/
│   ├── useXXX.ts       # Feature固有のカスタムフック
│   └── index.ts        # バレルエクスポート
├── components/
│   ├── {Name}Form.tsx
│   ├── {Name}Table.tsx
│   └── index.ts        # バレルエクスポート
├── pages/
│   ├── {Name}ListPage.tsx
│   ├── {Name}DetailPage.tsx
│   └── index.ts        # バレルエクスポート
├── utils/              # (任意) Feature固有のユーティリティ
├── types.ts            # (任意) Feature固有の型定義
└── constants.ts        # (任意) Feature固有の定数
```

### ルール

1. **API層は `api.ts` に統一**
   - `api/` ディレクトリは使用しない
   - 基本的なCRUD操作は `shared/hooks/useMasterApi.ts` を使用
   - `api.ts` には型定義とBulk操作などの特殊なAPIロジックのみ

2. **バレルエクスポート**
   - 各サブディレクトリに `index.ts` を配置
   - 他のfeatureからのインポートを簡潔にする

3. **型定義**
   - OpenAPI生成型（`@/types/api`）を優先
   - Feature固有の型は `types.ts` に配置

4. **命名規則**
   - ページ: `{Name}ListPage.tsx`, `{Name}DetailPage.tsx`
   - フック: `use{Name}.ts` (例: `useProducts.ts`)
   - コンポーネント: `{Name}Form.tsx`, `{Name}Table.tsx`

## API層のベストプラクティス

### CRUD操作

基本的なCRUD操作には `useMasterApi` を使用します：

```typescript
// features/products/hooks/useProducts.ts
import { useMasterApi } from "@/shared/hooks/useMasterApi";
import type { Product } from "../api";

export const useProducts = () => {
  return useMasterApi<Product>("masters/products", "products");
};
```

### 使用例

```typescript
// features/products/pages/ProductsListPage.tsx
import { useProducts } from "../hooks";

export function ProductsListPage() {
  const { useList, useCreate } = useProducts();
  const { data: products = [], isLoading } = useList();
  const { mutate: createProduct } = useCreate();
  
  // ...
}
```

### Bulk操作

Bulk操作など特殊なAPIロジックは `api.ts` に定義：

```typescript
// features/products/api.ts
import { http } from "@/services/http";

export async function bulkUpsertProducts(rows: ProductBulkRow[]) {
  // 実装...
}
```

## HTTPクライアント

### kyベースのクライアント使用

新しいコードでは `@/shared/api/http-client` (ky) を使用：

```typescript
import { http } from "@/shared/api/http-client";

// Good ✅
const products = await http.get<Product[]>("masters/products");

// Bad ❌ (古いaxiosベース)
import { http } from "@/services/http";
```

### レガシーコード

`@/services/http` (axios) は段階的に移行中です。新しいコードでは使用しないでください。

## React Query

### キャッシュキー

キャッシュキーは配列形式で、階層的に定義：

```typescript
// Good ✅
const queryKey = ["products"];
const detailKey = ["products", productCode];

// Bad ❌
const queryKey = "products";
```

### Mutation

```typescript
const { mutate } = useMutation({
  mutationFn: (data) => http.post("endpoint", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

## TypeScript

### 型インポート

型のみのインポートには `type` キーワードを使用：

```typescript
// Good ✅
import type { Product } from "../api";

// Bad ❌
import { Product } from "../api";
```

### null vs undefined

- API schema由来: `null` を許容する場合がある
- UI state: `undefined` を優先
- 型変換が必要な場合は明示的にキャスト

## コンポーネント

### ファイル命名

- PascalCase: `ProductForm.tsx`
- 1ファイル1コンポーネントを原則とする

### Props型定義

```typescript
export interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
```

## 移行ガイド

### api/ ディレクトリからapi.tsへの移行

1. `api/` 内の型定義を `api.ts` に集約
2. CRUD関数は削除（`useMasterApi` 使用）
3. Bulk操作など特殊なロジックのみ残す
4. すべてのインポートを更新

### 古いフックの削除

1. `useXXXQuery` → `useXXX().useList()` / `useXXX().useGet()`
2. `useXXXMutations` → `useXXX().useCreate()` / `useXXX().useUpdate()` / `useXXX().useDelete()`
3. 移行後、古いフックファイルを削除

## 参考実装

- **Products feature**: 標準構成のリファレンス実装
  - `frontend/src/features/products/`
