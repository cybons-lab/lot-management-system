# Library Recommendations & Best Practices

**更新日**: 2025-11-28
**ステータス**: Phase 1完了、追加提案含む

このドキュメントでは、コードベースの品質・保守性向上のために採用したライブラリと、追加の推奨事項をまとめています。

---

## ✅ 採用済みライブラリ

### 1. **qs** - URLSearchParams構築

**インストール**: ✅ 完了
```bash
npm install qs @types/qs
```

**用途**: URLクエリパラメータの構築・解析

**メリット**:
- 配列・ネストオブジェクト対応
- RFC 3986準拠
- 軽量（7KB gzipped）
- 78箇所のURLSearchParams手動構築を削減

**使用例**:
```typescript
import { buildSearchParams } from "@/shared/utils/api-helpers";

// シンプルなパラメータ
const url = `/api/orders${buildSearchParams({ skip: 0, limit: 100 })}`;
// → /api/orders?skip=0&limit=100

// 配列・ネストオブジェクト
const url2 = `/api/orders${buildSearchParams({
  filters: { status: ["active", "pending"] },
  sort: "created_at"
})}`;
// → /api/orders?filters[status][0]=active&filters[status][1]=pending&sort=created_at
```

**配置**: `frontend/src/shared/utils/api-helpers.ts`

---

### 2. **PapaParse** - CSV処理

**インストール**: ✅ 完了
```bash
npm install papaparse @types/papaparse
```

**用途**: CSV解析・生成

**メリット**:
- RFC 4180準拠（CSV公式仕様）
- ストリーミング対応（大ファイルOK）
- Worker対応（UIブロックなし）
- エラーハンドリング充実
- **400行の重複コードを削減**

**使用例**:
```typescript
import { CsvParser, downloadCSV, generateSimpleCSV } from "@/shared/utils/csv-parser";

// パース
const parser = new CsvParser<CustomerRow>({
  headers: ["operation", "customer_code", "customer_name"],
  requiredFields: ["operation", "customer_code"],
  parseRow: (data, rowNum) => ({ ...data }),
});
const result = await parser.parseFile(file);

// 生成
const csv = generateSimpleCSV(customers);
downloadCSV(csv, "customers.csv");
```

**配置**: `frontend/src/shared/utils/csv-parser.ts`

---

### 3. **ky** - HTTP Client

**インストール**: ✅ 完了
```bash
npm install ky
```

**用途**: HTTP通信（Axios代替）

**メリット**:
- fetchベース（標準API）
- TypeScript優先設計
- 軽量（11KB vs Axios 33KB）
- Retry/Timeout標準装備
- Hooks対応

**使用例**:
```typescript
import { http } from "@/shared/api/http-client";

// GET
const customers = await http.get<Customer[]>("/customers");

// POST
const newCustomer = await http.post<Customer>("/customers", {
  customer_code: "C001",
  customer_name: "Tokyo Corp"
});

// リソースクライアント（CRUD簡略化）
import { createResourceClient } from "@/shared/api/http-client";
const customersApi = createResourceClient<Customer>("/customers");
await customersApi.list();
await customersApi.get("C001");
await customersApi.create({ ... });
```

**配置**: `frontend/src/shared/api/http-client.ts`

**移行戦略**:
1. 新規コードはkyを使用
2. 既存のaxios使用箇所は段階的に移行
3. `services/http.ts`を徐々に`shared/api/http-client.ts`に置き換え

---

### 4. **use-immer** - 不変状態更新

**インストール**: ✅ 完了
```bash
npm install use-immer
```

**用途**: React状態の不変更新を簡潔に

**メリット**:
- 直感的なミュータブル風構文
- 内部で不変性を保証
- TypeScript完全対応
- 複雑なネスト更新が簡単

**使用例**:
```typescript
import { useImmer } from "use-immer";

function OrderForm() {
  const [order, setOrder] = useImmer({
    lines: [],
    customer: null,
    total: 0
  });

  const addLine = (product) => {
    setOrder(draft => {
      draft.lines.push({ product, quantity: 1 });
      draft.total += product.price;
    });
  };

  const updateQuantity = (index, qty) => {
    setOrder(draft => {
      draft.lines[index].quantity = qty;
      draft.total = draft.lines.reduce((sum, line) =>
        sum + line.product.price * line.quantity, 0
      );
    });
  };
}
```

**使用推奨箇所**:
- 複雑なフォーム状態
- 配列・オブジェクトのネスト更新
- 注文明細の編集など

---

### 5. **zod-to-json-schema** - スキーマ統合

**インストール**: ✅ 完了
```bash
npm install zod-to-json-schema
```

**用途**: ZodスキーマをJSON Schemaに変換（OpenAPI統合用）

**メリット**:
- Backend/Frontendでスキーマ定義を統一
- 型安全性向上
- バリデーションロジックの一元化

**使用例**:
```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Zodスキーマ（Frontend/Backendで共有可能）
const customerSchema = z.object({
  customer_code: z.string().min(1, "必須"),
  customer_name: z.string().min(1, "必須"),
});

// Frontend: react-hook-formで使用
import { zodResolver } from "@hookform/resolvers/zod";
const { register, handleSubmit } = useForm({
  resolver: zodResolver(customerSchema)
});

// Backend: JSON Schemaに変換してOpenAPIに統合
const jsonSchema = zodToJsonSchema(customerSchema);
```

**配置**: 必要に応じてschema定義ファイルに追加

---

## 🎯 追加推奨ライブラリ

### 6. **date-fns** - 日付処理

**優先度**: HIGH

```bash
npm install date-fns
```

**現状**: 日付処理が各所で異なる実装
**理由**:
- Tree-shakable（必要な関数のみバンドル）
- TypeScript完全対応
- ロケール対応（日本語含む）
- momentより軽量（Moment.js: 67KB, date-fns: 13KB）

**使用例**:
```typescript
import { format, addDays, isBefore } from "date-fns";
import { ja } from "date-fns/locale";

// フォーマット
const formatted = format(new Date(), "yyyy年MM月dd日", { locale: ja });
// → "2025年11月28日"

// 計算
const tomorrow = addDays(new Date(), 1);

// 比較
if (isBefore(lot.expiry_date, new Date())) {
  console.log("期限切れ");
}
```

**メリット**:
- FEFO計算での日付比較が簡潔に
- 期限アラートの計算が明確に
- 日本語フォーマットが簡単

---

### 7. **radash** - ユーティリティ関数

**優先度**: MEDIUM

```bash
npm install radash
```

**現状**: lodashは重い、カスタムユーティリティが散在
**理由**:
- TypeScript優先設計
- Tree-shakable
- モダンなAPI
- lodashより軽量・高速

**使用例**:
```typescript
import { groupBy, unique, sum } from "radash";

// グループ化
const ordersByCustomer = groupBy(orders, o => o.customer_id);

// ユニーク
const uniqueProducts = unique(orderLines, l => l.product_id);

// 合計
const totalQty = sum(orderLines, l => l.quantity);
```

**代替案**: lodash-es（tree-shakable版lodash）

---

### 8. **class-variance-authority (cva)** - Tailwind CSS variants

**優先度**: MEDIUM

```bash
npm install class-variance-authority
```

**現状**: Tailwindクラスの条件分岐が複雑
**理由**:
- shadcn/uiで標準採用
- 型安全なvariant管理
- クラス名の結合・優先順位管理

**使用例**:
```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "rounded font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "px-3 py-1 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// 使用
<button className={buttonVariants({ variant: "danger", size: "lg" })}>
  削除
</button>
```

---

### 9. **vitest** - テストフレームワーク

**優先度**: HIGH

```bash
npm install -D vitest @vitest/ui
```

**現状**: テストが不足、またはjest使用
**理由**:
- Viteネイティブ（爆速）
- Jest互換API
- TypeScript・ESM完全対応
- UI付きtest runner

**使用例**:
```typescript
// utils.test.ts
import { describe, it, expect } from "vitest";
import { buildSearchParams } from "./api-helpers";

describe("buildSearchParams", () => {
  it("should build query string from params", () => {
    expect(buildSearchParams({ skip: 0, limit: 100 })).toBe("?skip=0&limit=100");
  });

  it("should skip undefined values", () => {
    expect(buildSearchParams({ skip: undefined, limit: 100 })).toBe("?limit=100");
  });
});
```

**package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 10. **prettier-plugin-tailwindcss** - Tailwindクラス自動ソート

**優先度**: LOW（でも便利）

```bash
npm install -D prettier-plugin-tailwindcss
```

**現状**: Tailwindクラスの順序がバラバラ
**理由**:
- 公式推奨
- クラス順序を自動整列
- diff読みやすさ向上

**設定**:
```json
// .prettierrc
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindConfig": "./tailwind.config.js"
}
```

**効果**:
```tsx
// Before
<div className="text-white bg-blue-500 p-4 rounded">

// After (自動ソート)
<div className="rounded bg-blue-500 p-4 text-white">
```

---

### 11. **@tanstack/react-query-devtools** - クエリデバッグ

**優先度**: HIGH（開発時のみ）

```bash
npm install -D @tanstack/react-query-devtools
```

**現状**: TanStack Query使用中だが、devtoolsなし
**理由**:
- クエリキャッシュの可視化
- Refetch履歴
- ネットワーク状態監視

**使用例**:
```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

---

### 12. **@hookform/devtools** - フォームデバッグ

**優先度**: MEDIUM（開発時のみ）

```bash
npm install -D @hookform/devtools
```

**現状**: react-hook-form使用中だが、devtoolsなし
**理由**:
- フォーム状態の可視化
- バリデーションエラー追跡
- 再レンダリング監視

**使用例**:
```tsx
import { DevTool } from "@hookform/devtools";

function OrderForm() {
  const { control, ...rest } = useForm();

  return (
    <>
      <form>...</form>
      {import.meta.env.DEV && <DevTool control={control} />}
    </>
  );
}
```

---

## 🚀 すぐに導入推奨

| ライブラリ | 優先度 | 工数 | 効果 |
|-----------|--------|------|------|
| **date-fns** | HIGH | 2h | 日付処理統一、FEFOロジック改善 |
| **vitest** | HIGH | 4h | テスト環境整備、品質向上 |
| **React Query Devtools** | HIGH | 0.5h | 開発効率大幅向上 |
| **cva** | MEDIUM | 3h | UI一貫性向上 |
| **radash** | MEDIUM | 2h | ユーティリティ統一 |
| **Tailwind plugin** | LOW | 0.5h | コード整形自動化 |

---

## 📦 採用しないライブラリ（理由付き）

### ❌ Moment.js
**理由**: 重い（67KB）、ミュータブル、メンテナンス終了
**代替**: date-fns

### ❌ Axios
**理由**: ky採用済み
**例外**: 既存コードは段階的移行

### ❌ lodash（full）
**理由**: 重い（70KB）
**代替**: radash or lodash-es（tree-shakable版）

### ❌ Redux Toolkit
**理由**: TanStack Query + Jotaiで十分
**現状**: グローバル状態はJotai、サーバー状態はTanStack Queryで管理済み

---

## 🔧 実装ステータス

### Phase 1完了 ✅
- [x] qs - URLSearchParams
- [x] PapaParse - CSV処理
- [x] ky - HTTP Client
- [x] use-immer - 状態管理
- [x] zod-to-json-schema - スキーマ統合

### Phase 2予定
- [ ] date-fns - 日付処理
- [ ] vitest - テスト環境
- [ ] React Query Devtools - デバッグツール
- [ ] cva - Tailwind variants
- [ ] radash - ユーティリティ

---

## 📚 参考リンク

- [qs](https://github.com/ljharb/qs)
- [PapaParse](https://www.papaparse.com/)
- [ky](https://github.com/sindresorhus/ky)
- [use-immer](https://github.com/immerjs/use-immer)
- [date-fns](https://date-fns.org/)
- [radash](https://radash-docs.vercel.app/)
- [class-variance-authority](https://cva.style/)
- [vitest](https://vitest.dev/)

---

**Last Updated**: 2025-11-28
**Maintained by**: Development Team
