# Excel View 改善 - 次のステップ

**最終更新:** 2026-02-03

---

## ✅ 完了済みタスク (2026-02-03)

### 1. TMPロット非表示
**修正内容:**
- `useExcelViewData.ts`でTMPロット（`TMP-`プレフィックス）をフィルタリング
- Excelビューに一時ロットが表示されなくなった

**修正ファイル:**
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 2. ExcelPortal UI改善（倉庫選択削除）
**修正内容:**
- 3ステップ（仕入先 → 得意先品番 → 倉庫）から2ステップ（仕入先 → 製品）に簡略化
- 製品選択後、直接Excelビューに遷移（全倉庫統合表示）
- メーカー品番と製品名を主表示に変更
- 各ロットに倉庫情報を表示

**修正ファイル:**
- `frontend/src/features/inventory/pages/ExcelPortalPage.tsx`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`
- `frontend/src/features/inventory/components/excel-view/types.ts`
- `frontend/src/features/inventory/components/excel-view/subcomponents/LotInfoGroups.tsx`
- `frontend/src/MainRoutes.tsx`
- `frontend/src/constants/routes.ts`

**ルーティング変更:**
- 変更前: `/inventory/excel-view/:productId/:warehouseId/:customerItemId?`
- 変更後: `/inventory/excel-view/:productId/:customerItemId?`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 3. 新規ロット追加後の画面更新問題修正
**問題:**
- QuickLotIntakeDialogで新規ロット作成後、成功トーストは表示されるが画面に反映されない

**根本原因:**
- キャッシュ無効化が不十分（`["lots"]`のみで、`["inventoryItems"]`と`["allocationSuggestions"]`が漏れていた）
- キャッシュ無効化完了前にダイアログが閉じられていた

**修正内容:**
- `createLotMutation`と`createMovementMutation`のonSuccessハンドラーを修正
- 3つのキャッシュを無効化：`["lots"]`, `["inventoryItems"]`, `["allocationSuggestions"]`
- `Promise.all`で無効化を`await`して完了を待つように変更

**修正ファイル:**
- `frontend/src/features/inventory/components/QuickLotIntakeDialog.tsx`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 4. ロットステータスの視覚的インジケーター強化（Phase 1.1）
**完了日:** 2026-02-03

**修正内容:**
- StatusBadgeにamberバリアント追加
- `pending_receipt`ステータスの色をwarning（黄色）からamber（琥珀色）に変更
- ロックアイコンは既に実装済み（使用不可ロット用）

**修正ファイル:**
- `frontend/src/shared/components/data/StatusBadge.tsx`
- `frontend/src/shared/utils/status.ts`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 5. 日付表示のタイムゾーン修正（Phase 1.2）
**完了日:** 2026-02-03

**修正内容:**
- `new Date(dateString)`をタイムゾーン安全な`parse(date, "yyyy-MM-dd", new Date())`に変更
- date-fnsの`parse`と`format`を使用してローカルタイムゾーン問題を解決
- ±1日のズレ問題を修正

**修正ファイル:**
- `frontend/src/features/inventory/utils/lot-columns.tsx`
- `frontend/src/features/inventory/components/InventoryTableComponents.tsx`
- `frontend/src/features/inbound-plan/components/InboundPlanTable.tsx`
- `frontend/src/features/inventory/hooks/useLotColumns.tsx`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 6. 編集・削除操作（Phase 2）
**完了日:** 2026-02-03

**修正内容:**
- LotSectionに右クリックコンテキストメニューを追加（編集・削除・アーカイブ）
- ConfirmDialogコンポーネントを作成（削除・アーカイブ確認用）
- LotInfoGroupsにダブルクリック編集機能を追加（入荷日、ロット番号、入庫No、消費期限）
- DateGridセルに編集時の視覚的フィードバックを追加

**修正ファイル:**
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/LotInfoGroups.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
- `frontend/src/components/ui/confirm-dialog.tsx` (新規作成)

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

### 7. Excel View 常時編集モード化
**完了日:** 2026-02-03

**修正内容:**
- DateGridセルを常時編集可能に変更（isEditing不要）
- クリックエリアをセル全体に拡大（h-full, py-2）
- 発注NO（order_no）を常時編集可能なInputに変更
- 成績書の日付をカレンダー選択式に変更（月/日表示、date-fns使用）
- 入庫No.と発注NO.の入力欄高さを統一（両方を常時編集可能に）
- 納入先の空白行一番上に「+」ボタンを追加（納入先追加機能プレースホルダー）

**修正ファイル:**
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/LotInfoGroups.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx`
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`

**コミット:** `feature/excel-view-urgent-fixes` ブランチ

---

## 📋 次のフェーズ

### **推奨: Excel View フェーズ3以降 - データ管理とワークフロー改善**

詳細な計画は `docs/project/EXCEL_VIEW_IMPROVEMENT_PLAN.md` を参照してください。

#### 次のタスク候補:

1. **成績書日付の保存機能実装**
   - 現在はプレースホルダー実装（toast表示のみ）
   - バックエンドAPIを実装してCOA日付を保存
   - `handleCoaDateChange`の実装を完成させる

2. **納入先追加機能実装**
   - 現在は「+」ボタンがプレースホルダー
   - 納入先選択ダイアログを実装
   - ロットに納入先を追加するAPI呼び出し

3. **フェーズ3: アーカイブと履歴データ管理**
   - アーカイブ機能の実装（現在はtoast表示のみ）
   - アーカイブされたロットの復元機能
   - アーカイブ済みロットの表示切り替え

4. **フェーズ4: 出荷日とリードタイム管理**
   - 出荷予定日の設定・表示
   - リードタイム計算と警告表示
   - 遅延リスクのハイライト

---

## 📚 関連ドキュメント

- **詳細実装計画:** `docs/project/EXCEL_VIEW_IMPROVEMENT_PLAN.md`
- **Phase 1-4 計画:** `docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md` (通知システム改善)
- **バックログ:** `docs/project/BACKLOG.md`

---

## 🚀 新しいチャットで始める際の手順

1. この `EXCEL_VIEW_NEXT_STEPS.md` を読む
2. `EXCEL_VIEW_IMPROVEMENT_PLAN.md` でフェーズ1の詳細を確認
3. フェーズ1.1（ロットステータスの視覚的インジケーター強化）から開始
4. 実装完了後、このファイルを更新して完了済みタスクに移動

---

## ⚠️ 注意事項

- **ブランチ:** `feature/excel-view-urgent-fixes` に緊急修正がコミット済み
- **品質チェック:** 実装後は必ず `make quality-check` を実行
- **型定義更新:** バックエンド変更後は `make frontend-typegen` を実行
- **Git Workflow:** 新しい機能は新しいfeatureブランチで開始すること

---

## 📊 進捗状況

- [x] 緊急修正: TMPロット非表示
- [x] 緊急修正: ExcelPortal UI改善
- [x] 緊急修正: 新規ロット追加後の画面更新問題
- [x] フェーズ1.1: ロットステータスの視覚的インジケーター強化
- [x] フェーズ1.2: 日付表示のタイムゾーン修正
- [x] フェーズ2: 編集・削除操作（右クリックメニュー）
- [x] Excel View UI改善: 常時編集モード化
- [ ] フェーズ3: アーカイブと履歴データ管理
- [ ] フェーズ4: 出荷日とリードタイム管理
- [ ] フェーズ5: 集計とレポート
- [ ] フェーズ6: マスターデータ管理
- [ ] フェーズ7: ショートカットと検索の強化
- [ ] フェーズ8: 単位管理の検討（保留）
