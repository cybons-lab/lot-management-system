# 担当仕入先フィルタ共通コンポーネント化計画

## 問題の本質

**現状**: 担当仕入先が0人なのに、警告が出るのは1ページ(Orders)のみ。他のページは警告なし。

**原因**: 各ページでUI実装がバラバラ
- `useSupplierFilter`フックはあるが、チェックボックス・警告バナーの実装は各ページ任せ
- 結果、実装漏れが発生

**解決策**: `SupplierFilterSet`として警告+セレクト+チェックボックスをセットで共通化

## 追加要件

1. **担当仕入先チェックはデフォルトON** - 0件ならアラート表示（オフにはしない）
2. **警告から設定画面を呼び出し可能** - 設定変更がリアルタイムで反映
3. **仕入先関連を1コンポーネントで完結** - 今後の変更も1箇所で済む

---

## 現状の実装状況

| ページ | チェックボックス | 警告バナー | 状態 |
|--------|----------------|-----------|------|
| Orders | ✅ | ✅ | 正常 |
| Inbound Plans | ✅ | ✅ | 正常 |
| Inventory | ✅ | ❌ | 警告漏れ |
| ExcelPortal | ✅ | ❌ | 警告漏れ |
| ExcelView | ❌ | ❌ | 未実装 |
| Intake History | ❌ | ❌ | 未実装 |
| Withdrawals | ❌ | ❌ | 部分実装 |
| UOM Conversions | ❌ | ❌ | 部分実装 |

---

## 実装計画

### Phase 1: SupplierFilterSet 共通コンポーネント作成

**新規ファイル**: `frontend/src/features/assignments/components/SupplierFilterSet.tsx`

**コンポーネント構成**:
```
SupplierFilterSet
├── SupplierAssignmentWarning  ← 担当なし警告（設定画面リンク付き）
├── SupplierSelect             ← 仕入先セレクト（オプション）
└── SupplierFilterCheckbox     ← 担当のみチェック（デフォルトON）
```

**Props設計**:
```tsx
interface SupplierFilterSetProps {
  // 仕入先セレクトの表示制御
  showSupplierSelect?: boolean;          // デフォルト: true
  selectedSupplierId?: number | null;
  onSupplierChange?: (id: number | null) => void;

  // チェックボックスのみ使う場合
  checkboxOnly?: boolean;                // デフォルト: false

  className?: string;
}
```

**レイアウト構成**:
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ 担当仕入先が設定されていません [設定画面を開く]          │  ← 警告（0件時のみ）
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 仕入先: [SearchableSelect ▼]     ☑担当仕入先のみ           │  ← フィルタ行
└─────────────────────────────────────────────────────────────┘
```

**内部ロジック**:
1. `useSupplierFilter`を内部で呼び出し
2. チェックボックスはデフォルトON（担当仕入先があれば）
3. 担当0件 → 警告バナー表示 + チェックボックスはONのまま（disabled）
4. 警告の「設定」ボタンからモーダルで担当仕入先を追加
5. 設定変更後は`useMySuppliers`のrefetchでリアルタイム反映

**モーダル実装**:
- 既存の`UserSupplierAssignmentDialog.tsx`を流用
- 現在のユーザーIDを渡して担当仕入先を追加
- 追加後、`my-suppliers`クエリをinvalidateして即反映

**利点**:
- 1コンポーネント追加で仕入先フィルタ完結
- 実装漏れが構造的に起きない
- 今後の変更も1箇所で済む

### Phase 2: 各ページへの適用

| ページ | 現状 | 修正内容 |
|--------|------|---------|
| Inventory | チェックあり/警告なし | `SupplierFilterSet`に置換 |
| ExcelPortal | チェックあり/警告なし | `SupplierFilterSet`に置換 |
| ExcelView | なし | `SupplierFilterSet`追加（警告のみ表示） |
| Intake History | なし | `SupplierFilterSet`追加 |
| Withdrawals | なし | `SupplierFilterSet`追加 |
| UOM Conversions | なし | `SupplierFilterSet`追加 |
| Orders | 正常動作 | `SupplierFilterSet`に置換（統一のため） |
| Inbound Plans | 正常動作 | `SupplierFilterSet`に置換（統一のため） |

---

## 修正対象ファイル

### 新規作成
- `frontend/src/features/assignments/components/SupplierFilterSet.tsx` - 統合コンポーネント
- `frontend/src/features/assignments/components/SupplierAssignmentWarning.tsx` - 警告バナー
- `frontend/src/features/assignments/components/MySupplierAssignmentDialog.tsx` - 自分用の担当仕入先追加モーダル（既存UserSupplierAssignmentDialogを拡張）

### 修正
- `frontend/src/features/assignments/components/index.ts` - エクスポート追加
- `frontend/src/features/assignments/hooks/useSupplierFilter.ts` - デフォルトON対応
- `frontend/src/features/inventory/pages/InventoryPage.tsx`
- `frontend/src/features/inventory/components/excel-portal/ExcelPortalPage.tsx`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/withdrawals/pages/WithdrawalsPage.tsx`
- `frontend/src/features/uom-conversions/pages/UomConversionsPage.tsx`
- `frontend/src/features/inventory/components/intake-history/IntakeHistoryTab.tsx`
- `frontend/src/features/orders/pages/OrdersListPage.tsx`
- `frontend/src/features/orders/components/OrdersFilters.tsx`
- `frontend/src/features/inbound-plans/pages/InboundPlansListPage.tsx`
- `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

---

## 検証方法

### テスト1: 担当仕入先0人の状態
1. 全ページで「担当仕入先が設定されていません」警告が表示されること
2. 警告から設定画面へ遷移できること
3. チェックボックスはON状態（disabled）であること

### テスト2: 担当仕入先を設定
1. 設定画面で担当仕入先を1つ以上設定
2. 設定後、元のページに戻る（またはリアルタイム反映）
3. 警告が消えること
4. チェックボックスがONで有効になること

### テスト3: フィルタ動作
1. チェックボックスON → 担当仕入先のみ表示
2. チェックボックスOFF → 全仕入先表示
3. 仕入先セレクトで絞り込み可能

### テスト4: 全ページ確認
以下の全ページで上記テストを実施:
- Orders, Inbound Plans, Inventory, ExcelPortal, ExcelView
- Intake History, Withdrawals, UOM Conversions

---

## 実装進捗

### 完了
- [x] `SupplierAssignmentWarning.tsx` 作成
- [x] `MySupplierAssignmentDialog.tsx` 作成
- [x] `SupplierFilterSet.tsx` 統合コンポーネント作成
- [x] `useSupplierFilter.ts` デフォルトON対応
- [x] `index.ts` エクスポート追加

### 作業中
- [ ] InventoryPage に適用

### 未着手
- [ ] ExcelPortalPage に適用
- [ ] ExcelViewPage に適用
- [ ] IntakeHistoryTab に適用
- [ ] WithdrawalsPage に適用
- [ ] UomConversionsPage に適用
- [ ] OrdersListPage / OrdersFilters に適用
- [ ] InboundPlansListPage / InboundPlansList に適用

---

## 既存コード参考

### useAuth からユーザーID取得
```tsx
import { useAuth } from "@/features/auth/AuthContext";
const { user } = useAuth();
// user.id でユーザーIDを取得
```

### 既存の警告パターン（OrdersListPage）
```tsx
{!logic.hasAssignedSuppliers && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>担当仕入先が設定されていません</AlertTitle>
    <AlertDescription>
      担当する仕入先を設定すると、自動的にフィルタが適用されます。
    </AlertDescription>
  </Alert>
)}
```

### 既存の担当仕入先追加ダイアログ
- `UserSupplierAssignmentDialog.tsx` を参考にMySupplierAssignmentDialogを作成
- 現在のユーザーIDを自動で使用する版
