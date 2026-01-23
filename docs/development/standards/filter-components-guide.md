# FilterContainer 使用ガイドライン

## 📋 概要

FilterContainerは、検索・フィルター機能を提供する統一されたコンポーネントです。アプリケーション全体で一貫したフィルターUIを提供し、コードの重複を削減します。

---

## 🎯 使用すべき場合

### ✅ FilterContainer を使用する

1. **検索 + 詳細フィルターがある場合**
   - 検索ボックス + ドロップダウン/セレクトボックスなど
   - 例: 受注管理、入荷予定、得意先品番マッピング

2. **複数のフィルター項目がある場合**
   - 3つ以上のフィルター項目
   - フィルターのリセット機能が必要

3. **展開/折りたたみ機能が必要な場合**
   - 詳細フィルターを通常は非表示にしたい
   - UI を簡潔に保ちたい

### ❌ FilterContainer を使用しない

1. **シンプルな検索のみの場合**
   - 検索ボックス1つだけ
   - 例: マスター管理ページ（得意先、製品、倉庫）
   - → 直接 `<Input type="search">` を使用

2. **フィルターが1-2個のシンプルなケース**
   - オーバーエンジニアリングになる可能性
   - 現在のシンプルな実装を維持

---

## 🔧 使い方

### 基本的な使い方

```tsx
import { SimpleFilterContainer } from "@/shared/components/data/FilterContainer";
import { useFilters } from "@/hooks/ui";

interface MyFilters extends FilterState {
  search: string;
  status: string;
  category: string;
}

function MyPageFilters() {
  const filters = useFilters<MyFilters>({
    search: '',
    status: 'all',
    category: 'all',
  });

  return (
    <SimpleFilterContainer
      searchValue={filters.values.search}
      onSearchChange={(value) => filters.set('search', value)}
      searchPlaceholder="検索..."
      onReset={filters.reset}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectFilterField
          label="ステータス"
          value={filters.values.status}
          onChange={(value) => filters.set('status', value)}
          options={statusOptions}
        />
        <SelectFilterField
          label="カテゴリ"
          value={filters.values.category}
          onChange={(value) => filters.set('category', value)}
          options={categoryOptions}
        />
      </div>
    </SimpleFilterContainer>
  );
}
```

### 展開/折りたたみ機能付き

```tsx
<FilterContainer
  searchValue={filters.values.search}
  onSearchChange={(value) => filters.set('search', value)}
  onReset={filters.reset}
  collapsible
  defaultExpanded={false}
  expandButtonText="詳細フィルター"
>
  {/* 詳細フィルター */}
</FilterContainer>
```

### 検索なしのフィルターのみ

```tsx
<SimpleFilterContainer
  hideSearch
  onReset={handleReset}
>
  {/* フィルター項目 */}
</SimpleFilterContainer>
```

---

## 📦 利用可能なバリアント

### 1. FilterContainer（基本）

展開/折りたたみ機能付きのフル機能版

```tsx
<FilterContainer
  searchValue={string}
  onSearchChange={(value: string) => void}
  searchPlaceholder={string}
  onReset={() => void}
  collapsible={boolean}
  defaultExpanded={boolean}
  expandButtonText={string}
>
  {children}
</FilterContainer>
```

### 2. SimpleFilterContainer

常に表示される簡易版

```tsx
<SimpleFilterContainer
  searchValue={string}
  onSearchChange={(value: string) => void}
  searchPlaceholder={string}
  onReset={() => void}
  hideSearch={boolean}  // 検索ボックスを非表示
>
  {children}
</SimpleFilterContainer>
```

### 3. InlineFilterContainer

横並びレイアウト版（将来実装予定）

```tsx
<InlineFilterContainer
  searchValue={string}
  onSearchChange={(value: string) => void}
  onReset={() => void}
>
  {children}
</InlineFilterContainer>
```

---

## 🎨 フィルターフィールドコンポーネント

FilterContainer内で使用できる標準フィルターフィールド：

```tsx
import {
  TextFilterField,
  SelectFilterField,
  CheckboxFilterField,
  DateFilterField,
} from "@/shared/components/data/filter-fields";

// テキスト入力
<TextFilterField
  label="製品コード"
  value={value}
  onChange={onChange}
  placeholder="例: P001"
/>

// セレクトボックス
<SelectFilterField
  label="ステータス"
  value={value}
  onChange={onChange}
  options={[
    { value: 'all', label: 'すべて' },
    { value: 'active', label: '有効' },
  ]}
/>

// チェックボックス
<CheckboxFilterField
  label="在庫ありのみ"
  checked={checked}
  onChange={onChange}
/>

// 日付入力
<DateFilterField
  label="開始日"
  value={value}
  onChange={onChange}
/>
```

---

## 🔄 状態管理: useFilters フック

### 基本的な使い方

```tsx
import { useFilters } from "@/hooks/ui";
import type { FilterState } from "@/hooks/ui/filters/useFilters";

interface MyFilters extends FilterState {
  search: string;
  status: string;
  inStock: boolean;
}

const filters = useFilters<MyFilters>({
  search: '',
  status: 'all',
  inStock: false,
});

// 使用例
filters.values.search        // フィルター値の取得
filters.set('search', '検索') // 単一フィルターの更新
filters.setMultiple({ ... })  // 複数フィルターの一括更新
filters.reset()               // デフォルトにリセット
filters.resetKey('search')    // 特定のフィルターのみリセット
filters.isDefault             // デフォルト状態か？
filters.activeCount           // アクティブなフィルター数
```

### 型定義の重要性

フィルター型は必ず `FilterState` を継承してください：

```tsx
// ✅ 正しい
interface MyFilters extends FilterState {
  search: string;
  status: string;
}

// ❌ 間違い
interface MyFilters {
  search: string;
  status: string;
}
```

---

## 📐 レイアウトパターン

### グリッドレイアウト（推奨）

```tsx
<SimpleFilterContainer>
  <div className="grid gap-4 md:grid-cols-3">
    <FilterField1 />
    <FilterField2 />
    <FilterField3 />
  </div>
</SimpleFilterContainer>
```

### 複数行レイアウト

```tsx
<SimpleFilterContainer>
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      {/* 第1行 */}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {/* 第2行 */}
    </div>
  </div>
</SimpleFilterContainer>
```

---

## 🚀 実装例

### 例1: 受注管理ページ

```tsx
// OrdersFilters.tsx
export function OrdersFilters({ filters }: OrdersFiltersProps) {
  return (
    <SimpleFilterContainer
      searchValue={(filters.values.search as string) || ""}
      onSearchChange={(value) => filters.set("search", value)}
      searchPlaceholder="受注番号、得意先、製品で検索..."
      onReset={filters.reset}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">得意先コード</label>
          <Input
            value={(filters.values.customer_code as string) || ""}
            onChange={(e) => filters.set("customer_code", e.target.value)}
          />
        </div>
        {/* その他のフィルター */}
      </div>
    </SimpleFilterContainer>
  );
}
```

### 例2: 得意先品番マッピング

```tsx
// CustomerItemsFilter.tsx
export function CustomerItemsFilter({
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
}: CustomerItemsFilterProps) {
  const handleReset = () => {
    setFilters({ customer_id: "", product_id: "" });
    setSearchQuery("");
  };

  return (
    <SimpleFilterContainer
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="品番で検索..."
      onReset={handleReset}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>得意先</Label>
          <SearchableSelect
            options={customerOptions}
            value={filters.customer_id}
            onChange={(value) => setFilters({ ...filters, customer_id: value })}
          />
        </div>
        <div>
          <Label>製品</Label>
          <SearchableSelect
            options={productOptions}
            value={filters.product_id}
            onChange={(value) => setFilters({ ...filters, product_id: value })}
          />
        </div>
      </div>
    </SimpleFilterContainer>
  );
}
```

### 例3: 入荷予定一覧（検索なし）

```tsx
// InboundPlansList.tsx
const renderFilters = () => (
  <SimpleFilterContainer
    hideSearch
    onReset={handleResetFilters}
  >
    <div className="grid gap-4 md:grid-cols-4">
      <div>
        <Label>仕入先</Label>
        <SearchableSelect
          options={supplierOptions}
          value={filters.supplier_id}
          onChange={(value) => onFilterChange({ ...filters, supplier_id: value })}
        />
      </div>
      <div>
        <Label>ステータス</Label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        >
          <option value="">すべて</option>
          <option value="planned">予定</option>
          <option value="received">入荷済</option>
        </select>
      </div>
      {/* 日付フィルターなど */}
    </div>
  </SimpleFilterContainer>
);
```

---

## ✅ ベストプラクティス

### 1. フィルター型定義

```tsx
// ✅ Good: FilterState を継承
interface ProductFilters extends FilterState {
  search: string;
  category: string;
  inStock: boolean;
}

// ✅ Good: デフォルト値を明確に
const defaultFilters: ProductFilters = {
  search: '',
  category: 'all',
  inStock: false,
};
```

### 2. リセット処理

```tsx
// ✅ Good: useFilters フックのリセットを使用
onReset={filters.reset}

// ✅ Good: カスタムリセット（追加処理が必要な場合）
const handleReset = () => {
  filters.reset();
  // 追加の処理
};
onReset={handleReset}
```

### 3. レスポンシブ対応

```tsx
// ✅ Good: md: ブレークポイントでカラム数を調整
<div className="grid gap-4 md:grid-cols-3">
  {/* モバイル: 1列、デスクトップ: 3列 */}
</div>
```

### 4. アクセシビリティ

```tsx
// ✅ Good: label 要素を使用
<div>
  <Label htmlFor="status-filter">ステータス</Label>
  <Select id="status-filter">
    {/* ... */}
  </Select>
</div>

// ✅ Good: プレースホルダーを適切に設定
<Input placeholder="例: PROD-001" />
```

---

## ⚠️ アンチパターン

### ❌ 避けるべきこと

```tsx
// ❌ Bad: シンプルな検索のみに FilterContainer を使用
<SimpleFilterContainer>
  {/* 検索ボックスだけ */}
</SimpleFilterContainer>
// → 直接 Input を使用する方がシンプル

// ❌ Bad: FilterState を継承しない
interface MyFilters {  // extends FilterState がない
  search: string;
}

// ❌ Bad: フィルター値の直接変更
filters.values.search = '新しい値';  // 動作しない
// → filters.set('search', '新しい値') を使用

// ❌ Bad: リセット処理の不備
onReset={() => {}}  // 何もしない
// → filters.reset() または適切なリセット処理を実装
```

---

## 📊 移行済みページ

以下のページで FilterContainer を使用中：

1. **受注管理** (`OrdersFilters.tsx`)
   - SimpleFilterContainer
   - 検索 + 5つのフィルター項目

2. **得意先品番マッピング** (`CustomerItemsFilter.tsx`)
   - SimpleFilterContainer
   - 検索 + 2つのセレクトボックス

3. **入荷予定一覧** (`InboundPlansList.tsx`)
   - SimpleFilterContainer (hideSearch)
   - 4つのフィルター項目（検索なし）

---

## 🔮 将来の拡張

予定されている機能：

- **フィルタープリセット**: 保存・呼び出し機能
- **フィルター履歴**: 最近使用したフィルター
- **高度な検索構文**: `status:active AND quantity:>100`
- **URL クエリパラメータ連携**: フィルター状態の URL 保存

---

## 📚 関連ドキュメント

- `/frontend/src/shared/components/data/FilterContainer.tsx` - コンポーネント実装
- `/frontend/src/shared/components/data/FilterContainer.example.tsx` - 使用例
- `/frontend/src/hooks/ui/filters/useFilters.ts` - フック実装
- `/docs/tasks/filter_components_standardization.md` - タスクドキュメント

---

## 💬 質問・フィードバック

このガイドラインについて質問やフィードバックがある場合は、開発チームまでお問い合わせください。

---

**最終更新**: 2026-01-09
**バージョン**: 1.0
