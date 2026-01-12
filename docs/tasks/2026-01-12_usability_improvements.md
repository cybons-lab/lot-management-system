# 使い勝手向上タスク（2026-01-12）

## 概要

フロントエンドのリスト画面について、使い勝手向上とUI一貫性の改善を行う。

---

## 完了済み（本日コミット済み）

- [x] `InboundPlansList`: 「主担当の仕入先のみ」フィルター追加
- [x] `InboundPlansList`: 「合計数量」カラム追加
- [x] `InboundPlansList`, `WithdrawalsListPage`: 配列のメモ化改善
- [x] `OrderLineColumns`: 納入先名のtooltip追加

---

## 優先度高（機能不具合・使い勝手に大きく影響）

### 1. テーブルソート機能の修正（InboundPlansList）

**問題**: `columns` に `sortable: true` が設定されているが、`DataTable` に `sort` と `onSortChange` props が渡されていないため、ソートが動作しない

**対象ファイル**: 
- `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

**修正内容**:
```tsx
// useTable から sort 関連の state を取得
// const table = useTable({ initialPageSize: 25 });
// ↓
const [sort, setSort] = useState<SortConfig>({ column: "planned_arrival_date", direction: "desc" });

// DataTable に props を追加
<DataTable
  ...
  sort={sort}
  onSortChange={setSort}
/>
```

---

### 2. ステータス表示の日本語化（InboundPlansList）

**問題**: ステータスが英語のまま表示されている（`planned`, `received` など）

**対象ファイル**: 
- `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

**修正内容**:
```tsx
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    planned: "予定",
    partially_received: "一部入荷",
    received: "入荷済",
    cancelled: "キャンセル",
  };
  return labels[status] || status;
};

// cell 内で使用
{getStatusLabel(row.status)}
```

---

## 優先度中（操作性・UX一貫性）

### 3. フィルターリセットボタンの追加

**対象ファイル**:
- `frontend/src/features/adjustments/pages/AdjustmentsListPage.tsx`
- `frontend/src/features/withdrawals/pages/WithdrawalsListPage.tsx`

**問題**: リセットボタンがない。`InboundPlansList` では `SimpleFilterContainer` の `onReset` で対応済み

---

### 4. 削除確認ダイアログの統一化

**対象ファイル**:
- `frontend/src/features/inbound-plans/pages/InboundPlansListPage.tsx`
- `frontend/src/features/users/pages/UsersListPage.tsx`
- `frontend/src/features/roles/pages/RolesListPage.tsx`

**問題**: `confirm()` を使用しており、他のページ（`ProductsListPage` 等）の `SoftDeleteDialog` / `PermanentDeleteDialog` と統一されていない

---

### 5. ページネーションの統一

**現状調査結果**:

| ページ | ページネーション | コンポーネント |
|-------|-----------------|---------------|
| InboundPlansList | ✅ あり | TablePagination |
| AdjustmentsListPage | ✅ あり | TablePagination |
| WithdrawalsListPage | ⚠️ カスタム | 前へ/次へボタン |
| ProductsListPage | ❌ なし | 全件表示 |
| CustomersListPage | ❌ なし | 全件表示 |
| SuppliersListPage | ❌ なし | 全件表示 |
| WarehousesListPage | ❌ なし | 全件表示 |
| UsersListPage | ✅ あり | TanstackTable（組み込み） |
| RolesListPage | ✅ あり | TanstackTable（組み込み） |

**対応方針**:
- マスタデータ（Product, Customer, Supplier, Warehouse）は件数が多くならないため現状維持でOK
- `WithdrawalsListPage` の `TablePagination` への統一は中優先度

---

## 優先度低（コード品質・メンテナンス性）

### 6. レイアウトコンテナの統一

**問題**: ページによって異なるコンテナを使用
- `PageContainer`: InboundPlansListPage, AdjustmentsListPage, UsersListPage, RolesListPage
- `div.container`: WithdrawalsListPage
- カスタム `styles.root`: ProductsListPage, CustomersListPage, SuppliersListPage, WarehousesListPage

**対応**: 段階的に `PageContainer` へ統一

---

### 7. フィルターUIの統一

**問題**: ページによって異なるフィルターコンテナを使用
- `SimpleFilterContainer`: InboundPlansList
- `Card`: WithdrawalsListPage
- 手動 `div`: AdjustmentsListPage, UsersListPage

---

## 実装順序

1. [x] テーブルソート機能の修正（InboundPlansList）
2. [x] ステータス表示の日本語化（InboundPlansList）
3. [x] フィルターリセットボタン追加（Adjustments, Withdrawals）
4. [x] 削除確認ダイアログ統一化（InboundPlans）
5. [ ] 削除確認ダイアログ統一化（Users, Roles）

---

## 補足: マスタページのページング実装状況

### ページネーション不要（件数が少ないマスタ）
- **商品マスタ**: DataTable使用、全件表示
- **得意先マスタ**: DataTable使用、全件表示
- **仕入先マスタ**: DataTable使用、全件表示
- **倉庫マスタ**: DataTable使用、全件表示

### ページネーションあり（トランザクションデータ）
- **入荷予定**: TablePagination使用
- **調整履歴**: TablePagination使用
- **出庫履歴**: カスタム実装（前へ/次へボタン）
- **ユーザー**: TanstackTable組み込み
- **ロール**: TanstackTable組み込み

マスタデータは通常数百件程度のため、現状のページネーションなし実装で問題なし。
トランザクションデータは適切にページネーションが実装されている。
