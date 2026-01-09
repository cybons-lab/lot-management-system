/**
 * FilterContainer 使用例
 *
 * このファイルは、FilterContainer コンポーネントと useFilters フックの
 * 使用方法を示すサンプルコードです。
 */

import { FilterContainer } from "./FilterContainer";
import { TextFilterField, SelectFilterField, CheckboxFilterField } from "./filter-fields";

import type { FilterState } from "@/hooks/ui/filters/useFilters";
import { useFilters } from "@/hooks/ui";

/**
 * フィルター型定義の例
 */
interface ProductFilters extends FilterState {
  search: string;
  category: string;
  warehouse: string;
  inStock: boolean;
  status: string;
}

/**
 * 製品一覧ページのフィルター実装例
 */
export function ProductListFiltersExample() {
  // useFilters フックでフィルター状態を管理
  const filters = useFilters<ProductFilters>({
    search: '',
    category: 'all',
    warehouse: 'all',
    inStock: false,
    status: 'all',
  });

  // カテゴリオプション（実際にはAPIから取得）
  const categoryOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'electronics', label: '電子部品' },
    { value: 'mechanical', label: '機械部品' },
    { value: 'chemical', label: '化学製品' },
  ];

  // 倉庫オプション
  const warehouseOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'WH-01', label: '第1倉庫' },
    { value: 'WH-02', label: '第2倉庫' },
    { value: 'WH-03', label: '第3倉庫' },
  ];

  // ステータスオプション
  const statusOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'active', label: '有効' },
    { value: 'inactive', label: '無効' },
    { value: 'discontinued', label: '廃番' },
  ];

  return (
    <div className="space-y-4">
      {/* FilterContainer の基本的な使い方 */}
      <FilterContainer
        searchValue={filters.values.search}
        onSearchChange={(value) => filters.set('search', value)}
        searchPlaceholder="製品コード、製品名で検索..."
        onReset={filters.reset}
        collapsible
        expandButtonText="詳細フィルター"
      >
        {/* 詳細フィルター項目 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SelectFilterField
            label="カテゴリ"
            value={filters.values.category}
            onChange={(value) => filters.set('category', value)}
            options={categoryOptions}
          />

          <SelectFilterField
            label="倉庫"
            value={filters.values.warehouse}
            onChange={(value) => filters.set('warehouse', value)}
            options={warehouseOptions}
          />

          <SelectFilterField
            label="ステータス"
            value={filters.values.status}
            onChange={(value) => filters.set('status', value)}
            options={statusOptions}
          />
        </div>

        <CheckboxFilterField
          label="在庫ありのみ表示"
          checked={filters.values.inStock}
          onChange={(checked) => filters.set('inStock', checked)}
        />
      </FilterContainer>

      {/* フィルター状態の表示（デバッグ用） */}
      <div className="rounded-lg border bg-slate-50 p-4 text-sm">
        <h4 className="mb-2 font-semibold">フィルター状態:</h4>
        <pre className="text-xs">{JSON.stringify(filters.values, null, 2)}</pre>
        <p className="mt-2">
          デフォルト: {filters.isDefault ? 'Yes' : 'No'} | アクティブフィルター数: {filters.activeCount}
        </p>
      </div>
    </div>
  );
}

/**
 * シンプル版の使用例
 * （展開機能なし、常に全フィルター表示）
 */
export function SimpleProductFiltersExample() {
  const filters = useFilters<ProductFilters>({
    search: '',
    category: 'all',
    warehouse: 'all',
    inStock: false,
    status: 'all',
  });

  return (
    <FilterContainer
      searchValue={filters.values.search}
      onSearchChange={(value) => filters.set('search', value)}
      onReset={filters.reset}
      collapsible={false}  // 展開機能をオフ
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectFilterField
          label="カテゴリ"
          value={filters.values.category}
          onChange={(value) => filters.set('category', value)}
          options={[
            { value: 'all', label: 'すべて' },
            { value: 'electronics', label: '電子部品' },
          ]}
        />

        <SelectFilterField
          label="ステータス"
          value={filters.values.status}
          onChange={(value) => filters.set('status', value)}
          options={[
            { value: 'all', label: 'すべて' },
            { value: 'active', label: '有効' },
          ]}
        />
      </div>
    </FilterContainer>
  );
}

/**
 * LotsPageFilters の移行例
 * （旧実装を新 FilterContainer に置き換え）
 */
interface LotFilters extends FilterState {
  search: string;
  product_code: string;
  warehouse_code: string;
  status: string;
  expiry_date_from: string;
  expiry_date_to: string;
}

export function LotFiltersExample() {
  const filters = useFilters<LotFilters>({
    search: '',
    product_code: '',
    warehouse_code: '',
    status: 'all',
    expiry_date_from: '',
    expiry_date_to: '',
  });

  return (
    <FilterContainer
      searchValue={filters.values.search}
      onSearchChange={(value) => filters.set('search', value)}
      searchPlaceholder="ロット番号、製品コード、製品名で検索..."
      onReset={filters.reset}
      collapsible
      expandButtonText="詳細フィルター"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextFilterField
          label="製品コード"
          value={filters.values.product_code}
          onChange={(value) => filters.set('product_code', value)}
          placeholder="例: P001"
        />

        <TextFilterField
          label="倉庫コード"
          value={filters.values.warehouse_code}
          onChange={(value) => filters.set('warehouse_code', value)}
          placeholder="例: WH-01"
        />

        <SelectFilterField
          label="ステータス"
          value={filters.values.status}
          onChange={(value) => filters.set('status', value)}
          options={[
            { value: 'all', label: 'すべて' },
            { value: 'active', label: '有効' },
            { value: 'allocated', label: '引当済' },
            { value: 'shipped', label: '出荷済' },
            { value: 'inactive', label: '無効' },
          ]}
        />
      </div>
    </FilterContainer>
  );
}
