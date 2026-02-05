# 担当仕入先フィルタ (SupplierFilterSet) 仕様書

## 概要
ユーザーに割り当てられた「担当仕入先」に基づくデータの絞り込みと、未割り当て時の警告を行う共通コンポーネント。

## コンポーネント構成
`SupplierFilterSet` は以下のパーツをカプセル化している。

1. **警告バナー (SupplierAssignmentWarning)**:
    - ユーザーに担当仕入先が1つも割り当てられていない場合に表示される。
    - 担当割り当てがないとフィルタリングが正常に機能しないため、注意を促す。
2. **仕入先選択 (SupplierSelect)**: （プロパティにより表示/非表示を制御）
    - 特定の仕入先で絞り込むためのセレクトボックス。
3. **フィルタチェックボックス (SupplierFilterCheckbox)**:
    - 「担当仕入先のみ表示」のON/OFF。
    - ONの場合、`UserSupplierAssignment` に登録された仕入先コードを持つデータのみが表示される。

## 実装状況（2026-02-05 時点）
共通コンポーネントとしての定義は完了しているが、各画面への適用は以下の通り。

- [x] **Excel View**: 適用済み。警告バナーのみ表示（絞り込みは上位で制御）。
- [ ] **在庫一覧 (InventoryPage)**: 未適用。
- [ ] **発注予定一覧 (OrdersListPage)**: 未適用。
- [ ] **入庫予定一覧 (InboundPlansListPage)**: 未適用。
- [ ] **出庫履歴・実績**: 未適用。

## 使い方
```tsx
// 警告バナーのみ表示したい場合
<SupplierFilterSet warningOnly warningClassName="mb-4" />

// フル機能を表示したい場合
<SupplierFilterSet showSupplierSelect={true} />
```
