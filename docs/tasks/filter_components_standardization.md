# フィルター・検索コンポーネント標準化タスク

## ステータス

- **開始日**: 2026-01-09
- **担当**: Claude
- **優先度**: 高
- **進捗**: 🟡 進行中

---

## 📋 タスク概要

フロントエンドの検索・フィルターコンポーネントを統一し、重複実装を削減してUXと保守性を向上させる。

### 背景

現在、フィルター実装が各ページで独自実装されており、以下の問題が発生している:

1. **実装パターンの乱立** - 同じ目的で複数の実装方法が混在
2. **コード重複** - フィルターパネルの展開/非表示ロジックなどが重複
3. **UXの非一貫性** - ページごとに異なるフィルターUI

### 目的

- 統一されたフィルターコンポーネント構造の確立
- コード重複の削減
- 保守性とUXの向上

---

## 🔍 現状分析

### 既存の共通コンポーネント（活用中）

| コンポーネント | 場所 | 機能 |
|------------|------|------|
| `SearchBar` | `/shared/components/data/SearchBar.tsx` | デバウンス対応検索（300ms） |
| `InstantSearchBar` | 同上 | 即時反映検索 |
| `SearchableSelect` | `/components/ui/form/SearchableSelect.tsx` | コンボボックス形式 |
| FilterField ファミリー | `/shared/components/data/filter-fields/` | 各種フィルターフィールド |

### ページ固有の重複実装

| ファイル | 使用パターン | 問題点 |
|---------|-----------|--------|
| `LotFilters.tsx` | FilterPanel + SearchBar | 基本パターン |
| `LotAdvancedFilters.tsx` | グリッド + Input/Select | より詳細なフィルター |
| `LotsPageFilters.tsx` | 上記2つをラップ | **展開/非表示ロジックが独自実装** |
| `OrdersFilters.tsx` | useFilters + 独自UI | **フック版の実装** |
| `CustomerItemsFilter.tsx` | SearchableSelect + Input | マスター検索特化 |

### 重複している機能

1. **フィルターパネルの展開/収納ロジック**
   - LotsPageFiltersで独自実装
   - 他のページでは展開機能なし（実装されていない）

2. **フィルター状態管理**
   - useFiltersフック（一部ページ）
   - useState直接（多くのページ）

3. **フィルタークリア機能**
   - 各ページで独自実装

---

## 💡 改善案

### 1. FilterContainer コンポーネントの作成

統一されたフィルターコンテナを作成し、共通機能を提供する:

```tsx
<FilterContainer
  onFilterChange={handleFilterChange}
  onClear={handleClearFilters}
  collapsible={true}  // 展開/非表示機能
>
  <SearchBar placeholder="製品を検索..." />
  <FilterPanel>
    <SelectFilterField label="倉庫" options={warehouses} />
    <SelectFilterField label="仕入先" options={suppliers} />
    <DateRangeFilterField label="期間" />
  </FilterPanel>
</FilterContainer>
```

**提供する機能:**
- 展開/非表示ロジック（collapsibleプロップ）
- フィルタークリアボタン
- 統一されたレイアウト
- アクセシビリティ対応

### 2. useFilters フックの標準化

フィルター状態管理を統一:

```tsx
const {
  filters,
  setFilter,
  clearFilters,
  resetFilters,
  isActive
} = useFilters<FilterType>(defaultFilters);
```

### 3. フィルター実装パターンの統一

**推奨パターン:**

```tsx
// ページコンポーネント
export function ProductListPage() {
  const { filters, setFilter, clearFilters } = useFilters({
    search: '',
    warehouse_id: undefined,
    supplier_id: undefined,
  });

  return (
    <PageContainer>
      <FilterContainer
        onClear={clearFilters}
        collapsible
      >
        <SearchBar
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
        />
        <FilterPanel>
          <SelectFilterField
            label="倉庫"
            value={filters.warehouse_id}
            onChange={(value) => setFilter('warehouse_id', value)}
            options={warehouses}
          />
        </FilterPanel>
      </FilterContainer>

      {/* データ表示 */}
    </PageContainer>
  );
}
```

---

## 🎯 実装計画

### Phase 1: 共通コンポーネント作成（1日目）

- [ ] `FilterContainer` コンポーネント作成
  - [ ] 展開/非表示ロジック実装
  - [ ] クリアボタン統合
  - [ ] レイアウトスタイル定義

- [ ] `useFilters` フック標準化
  - [ ] ジェネリック型対応
  - [ ] クリア/リセット機能
  - [ ] URLクエリパラメータ連携（オプション）

### Phase 2: 既存コンポーネントのリファクタリング（2-3日目）

**優先順位順に移行:**

1. **高優先度（即座に効果が出る）**
   - [ ] `LotsPageFilters` → FilterContainer化
   - [ ] `OrdersFilters` → FilterContainer化
   - [ ] `CustomerItemsFilter` → FilterContainer化

2. **中優先度**
   - [ ] `LotAdvancedFilters` → FilterContainer統合
   - [ ] 在庫ページのフィルター
   - [ ] 入荷予定ページのフィルター

3. **低優先度（単純なフィルター）**
   - [ ] 得意先管理ページ
   - [ ] 製品管理ページ
   - [ ] 倉庫管理ページ

### Phase 3: ドキュメント・テスト（4日目）

- [ ] Storybook ストーリー作成
- [ ] 使用ガイドライン作成
- [ ] 既存フィルターの削除確認
- [ ] リグレッションテスト

---

## 📝 実装の詳細仕様

### FilterContainer Props

```typescript
interface FilterContainerProps {
  children: React.ReactNode;
  onClear?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  // フィルター適用ボタン表示（オプション）
  showApplyButton?: boolean;
  onApply?: () => void;
}
```

### useFilters Hook

```typescript
function useFilters<T extends Record<string, any>>(
  defaultFilters: T,
  options?: {
    syncWithUrl?: boolean;
    debounceMs?: number;
  }
): {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (newFilters: Partial<T>) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  isActive: boolean; // デフォルトから変更があるか
}
```

---

## ✅ 完了条件

- [ ] すべての主要ページが FilterContainer を使用
- [ ] 重複実装（LotFilters, LotAdvancedFilters等）が削除済み
- [ ] Storybook ストーリー作成済み
- [ ] ドキュメント更新済み
- [ ] リグレッションテスト合格

---

## 📊 効果測定

### 定量的効果

- コード行数削減: 推定 **-500行** （重複削減）
- ファイル数削減: 推定 **-5ファイル**
- バンドルサイズ: 推定 **-2KB**

### 定性的効果

- UX一貫性の向上
- 新規フィルター追加時の工数削減（既存パターン適用）
- 保守性向上（修正箇所の一元化）

---

## 🔗 関連タスク

- テーブル標準化タスク（完了）: DataTable統一化
- 削除ダイアログDRY化タスク（未着手）
- 日付ユーティリティ統一タスク（未着手）

---

## 📅 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-01-09 | ドキュメント作成 | Claude |
| | | |

---

## 💬 備考・補足

### 技術的な考慮事項

1. **既存の FilterPanel との互換性**
   - FilterPanel は FilterContainer 内で引き続き使用可能
   - 段階的移行を可能にする

2. **パフォーマンス**
   - useFilters フックでデバウンス対応
   - 不要な再レンダリング防止（useMemo/useCallback）

3. **アクセシビリティ**
   - キーボードナビゲーション対応
   - スクリーンリーダー対応
   - ARIA属性の適切な設定

### 将来的な拡張

- フィルタープリセット機能（保存・呼び出し）
- フィルター履歴
- 高度な検索構文対応（例: "status:active AND quantity:>100"）
