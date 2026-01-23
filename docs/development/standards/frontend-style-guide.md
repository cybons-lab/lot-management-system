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

### ⚠️ URLパスの注意点（重要）

**kyの`prefixUrl`を使用しているため、APIパスは先頭に`/`を付けないでください。**

```typescript
// Good ✅ - スラッシュなし
http.get("masters/products");
http.post("assignments/", data);
http.delete(`assignments/${id}`);

// Bad ❌ - 先頭にスラッシュあり（エラーになる）
http.get("/masters/products");
http.post("/assignments/", data);
http.delete(`/assignments/${id}`);
// → エラー: "input must not begin with a slash when using prefixUrl"
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

## 状態管理（Jotai）

### 派生Atomパイプライン
複雑なデータ変換ロジック（フィルタ、ソート、集計）はコンポーネント内の `useMemo` ではなく、Jotai の derived atoms に集約します。詳細は [Jotai Derived Atoms 設計標準](../development/standards/jotai-derived-atoms.md) を参照してください。

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

---

## エラー処理パターン

### 基本原則

1. **必ず`isError`をチェック**する
2. **ユーザーにフィードバック**を表示する
3. **エラーをログに記録**する
4. **リトライ可能**な操作は再試行オプションを提供

### ページコンポーネントでのエラー処理

#### ✅ 推奨パターン

```typescript
import { QueryError } from "@/components/error/QueryError";
import { LoadingSpinner } from "@/components/ui/loading";

export function ProductsListPage() {
  const { useList } = useProducts();
  const { data: products = [], isLoading, isError, error, refetch } = useList();

  // ローディング状態
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // エラー状態
  if (isError) {
    return <QueryError error={error} retry={refetch} />;
  }

  // 正常時のレンダリング
  return (
    <div>
      <ProductTable products={products} />
    </div>
  );
}
```

#### ❌ アンチパターン

```typescript
// ❌ エラーチェックなし
export function ProductsListPage() {
  const { useList } = useProducts();
  const { data } = useList();

  // data が undefined の可能性を無視
  return <ProductTable products={data} />;
}

// ❌ エラーを握りつぶす
export function ProductsListPage() {
  const { useList } = useProducts();
  const { data = [], isError } = useList();

  if (isError) {
    // ユーザーに何も表示しない
    return null;
  }

  return <ProductTable products={data} />;
}
```

### Mutationのエラー処理

#### ✅ 推奨パターン

```typescript
import { toast } from "react-hot-toast";
import { getErrorMessage } from "@/utils/errors";

export function ProductForm() {
  const { useCreate } = useProducts();
  const { mutate, isPending } = useCreate();

  const handleSubmit = (data: ProductCreateInput) => {
    mutate(data, {
      onSuccess: (newProduct) => {
        toast.success(`製品 ${newProduct.product_code} を作成しました`);
        navigate("/products");
      },
      onError: (error) => {
        // エラーメッセージを表示
        toast.error(`作成に失敗しました: ${getErrorMessage(error)}`);

        // 特定のエラーコードに対する処理
        if (error instanceof ApiError && error.status === 409) {
          // フォームにエラーを設定
          form.setError("product_code", {
            message: "この製品コードは既に使用されています",
          });
        }
      },
    });
  };

  return <form onSubmit={form.handleSubmit(handleSubmit)}>...</form>;
}
```

#### カスタムエラーハンドリング

特定のステータスコードに対して異なる処理を行う：

```typescript
const { mutate: deleteProduct } = useDelete();

const handleDelete = (productCode: string) => {
  deleteProduct(productCode, {
    onError: (error) => {
      if (error instanceof ApiError) {
        switch (error.status) {
          case 404:
            toast.error("製品が見つかりません");
            break;
          case 409:
            toast.error("この製品は使用中のため削除できません");
            break;
          case 403:
            toast.error("削除する権限がありません");
            break;
          default:
            toast.error(getErrorMessage(error));
        }
      } else {
        toast.error("削除に失敗しました");
      }
    },
  });
};
```

### カスタムフックでのエラー処理

#### グローバルエラーハンドリング

多くのケースでは、React Queryのグローバル設定で十分：

```typescript
// useMasterApi.ts - シンプルなパターン
export function useMasterApi<T>(resourcePath: string, queryKey: string) {
  const useList = () =>
    useQuery({
      queryKey: [queryKey],
      queryFn: () => http.get<T[]>(resourcePath),
      // グローバルonErrorが自動的に適用される
    });

  return { useList, useGet, useCreate, useUpdate, useDelete };
}
```

#### カスタムエラーハンドリングが必要な場合

特定の機能でエラー処理をカスタマイズする：

```typescript
// features/products/hooks/useProducts.ts
export function useProducts() {
  const queryClient = useQueryClient();

  const useList = () =>
    useQuery({
      queryKey: ["products"],
      queryFn: () => http.get<Product[]>("masters/products"),
      onError: (error) => {
        // この機能固有のエラー処理
        logError("Products", error, { context: "list" });

        // 特定のエラーには特別な処理
        if (error instanceof AuthenticationError) {
          // 認証エラーの場合はログインページにリダイレクト
          window.location.href = "/login";
        }
      },
    });

  const useCreate = () =>
    useMutation({
      mutationFn: (data: ProductCreate) => http.post<Product>("masters/products", data),
      onSuccess: () => {
        // キャッシュの無効化
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("製品を作成しました");
      },
      onError: (error) => {
        // 作成失敗時の詳細なエラーハンドリング
        if (error instanceof ValidationError) {
          toast.error("入力内容を確認してください");
        } else if (error instanceof ApiError && error.status === 409) {
          toast.error("この製品コードは既に登録されています");
        } else {
          toast.error(`作成に失敗しました: ${getErrorMessage(error)}`);
        }
      },
    });

  return { useList, useCreate };
}
```

### エラー表示コンポーネント

#### QueryError - クエリエラー用

```typescript
// components/error/QueryError.tsx
interface QueryErrorProps {
  error: Error;
  retry?: () => void;
  title?: string;
}

export function QueryError({ error, retry, title = "データの読み込みに失敗しました" }: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{getErrorMessage(error)}</p>
      </div>
      {retry && (
        <Button onClick={retry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          再試行
        </Button>
      )}
    </div>
  );
}
```

使用例：

```typescript
if (isError) {
  return <QueryError error={error} retry={refetch} />;
}
```

#### FormError - フォームエラー用

```typescript
// components/error/FormError.tsx
interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="rounded-md bg-red-50 p-3">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <p className="ml-3 text-sm text-red-700">{message}</p>
      </div>
    </div>
  );
}
```

### エラーユーティリティ

#### getErrorMessage - ユーザーフレンドリーなメッセージ抽出

```typescript
// utils/errors/helpers.ts
import type { ApiError, NetworkError } from "./custom-errors";

export function getErrorMessage(error: unknown): string {
  // ApiErrorの場合
  if (error instanceof ApiError) {
    return error.message;
  }

  // NetworkErrorの場合
  if (error instanceof NetworkError) {
    return "ネットワーク接続を確認してください";
  }

  // 通常のErrorオブジェクト
  if (error instanceof Error) {
    return error.message;
  }

  // その他
  return "予期しないエラーが発生しました";
}
```

#### isApiError - エラー型チェック

```typescript
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
```

### React Queryグローバル設定

#### エラーハンドリングを含む推奨設定

```typescript
// main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { logError } from "@/services/error-logger";
import { getErrorMessage, NotFoundError } from "@/utils/errors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // リトライ設定
      retry: (failureCount, error) => {
        // 404, 401, 403 はリトライしない
        if (error instanceof ApiError && [404, 401, 403].includes(error.status)) {
          return false;
        }
        // それ以外は3回までリトライ
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // キャッシュ設定
      staleTime: 5 * 60 * 1000, // 5分

      // グローバルエラーハンドリング
      onError: (error) => {
        logError("Query", error);

        // 404はトーストを表示しない（多くの場合、UIで処理する）
        if (!(error instanceof NotFoundError)) {
          toast.error(getErrorMessage(error));
        }
      },
    },
    mutations: {
      retry: false, // Mutationは基本的にリトライしない
      onError: (error) => {
        logError("Mutation", error);
        toast.error(getErrorMessage(error));
      },
    },
  },
});
```

### テスト時のエラー処理

#### MSWでエラーレスポンスをモック

```typescript
// mocks/handlers.ts
import { rest } from "msw";

export const handlers = [
  // 正常レスポンス
  rest.get("/api/products", (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([]));
  }),

  // エラーレスポンス（テスト用）
  rest.post("/api/products", (req, res, ctx) => {
    return res(
      ctx.status(409),
      ctx.json({
        type: "about:blank",
        title: "DuplicateProductError",
        status: 409,
        detail: "製品コード PROD-001 は既に存在します",
        error_code: "DUPLICATE_PRODUCT",
      }),
    );
  }),

  // ネットワークエラー
  rest.get("/api/products/:code", (req, res) => {
    return res.networkError("Failed to connect");
  }),
];
```

### チェックリスト

新しいページコンポーネントを作成する際は、以下を確認：

- [ ] `isLoading`状態を処理している
- [ ] `isError`状態を処理している
- [ ] エラー時にユーザーフィードバックを表示している
- [ ] 可能な操作には再試行オプションを提供している
- [ ] Mutationに`onSuccess`と`onError`ハンドラを実装している
- [ ] エラーメッセージが日本語でユーザーフレンドリーである
- [ ] エラーがログに記録されている
