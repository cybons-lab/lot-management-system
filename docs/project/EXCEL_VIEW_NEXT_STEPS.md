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

### 8. オートセーブとマスタ連携（Phase 3 準備）
**完了日:** 2026-02-03

**修正内容:**
- **オートセーブの導入:** 数量入力、成績書日付、ロット付随情報の入力をフォーカスアウト（onBlur）時に自動保存するように変更。
- **入力不具合の修正:** 入力中の再レンダリングによるフォーカス喪失を防ぐため、セル単位でローカルステートを導入。
- **納入先追加機能の永続化:** 数量 0 のレコードであっても、手動入力（manual_excel）ソースの場合は保持するようにバックエンドのロジックを修正。
- **マスタ自動同期:** Excel View で納入先を追加した際、自動的に「得意先品番マスタ」の納入先別設定にもレコードが作成されるように同期処理を実装。
- **常時表示の強化:** マスタに登録されている納入先は、引当実績がなくても常に Excel View のテーブルに入力行として表示されるように改善。

**修正ファイル:**
- `backend/app/application/services/allocations/suggestion.py`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/LotInfoGroups.tsx`

---

### 9. アーカイブ機能（Phase 3）
**完了日:** 2026-02-03

**修正内容:**
- Excel View のロットカード右上にアーカイブ/削除アイコンを追加
- 在庫が残っているロットはロット番号入力確認付きでアーカイブ
- 出荷数量がある場合は削除不可（ボタン無効化）
- アーカイブ成功時に関連キャッシュを無効化して画面反映

**修正ファイル:**
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/excel-view/types.ts`
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`
- `frontend/src/features/inventory/components/LotArchiveDialog.tsx`

---

### 10. フェーズ5-1: 納入先別月次集計
**完了日:** 2026-02-03

**修正内容:**
- 月次レポートAPIを追加（納入先別集計）
- 月次レポートページを追加（年/月・製品・倉庫選択 + CSV出力）
- テストデータ生成時にレポート用サンプル集計データを追加

**修正ファイル:**
- `backend/app/presentation/api/routes/reports/report_router.py`
- `backend/app/application/services/reports/report_service.py`
- `backend/app/application/services/test_data/reports.py`
- `backend/app/application/services/test_data_generator.py`
- `frontend/src/features/reports/components/MonthlyReportPage.tsx`
- `frontend/src/features/reports/api.ts`
- `frontend/src/MainRoutes.tsx`
- `frontend/src/components/layouts/GlobalNavigation.tsx`
- `frontend/src/constants/routes.ts`
- `frontend/src/config/feature-config.ts`

---

## 📋 次のフェーズ

### **推奨: 残課題の解決とアーカイブ機能実装**

1. [ ] **納入先追加の反映問題の解決**
   - 納入先を追加した直後に画面に反映されない、あるいは追加に失敗するケースの調査と修正。
   - キャッシュの Invalidation（特にマスタデータ周り）の最適化。

2. [ ] **ロット重複時のエラーハンドリング強化**
   - ロット番号が既に存在する場合、保存時に適切なトースト通知とバリデーションを表示するように改善。

3. [x] **アーカイブ機能の実装 (Phase 3)**
   - 古いロットをアーカイブし、表示を整理する機能の実装。

4. [ ] **数量変更のデバウンス処理 (High Priority)**
   - 現在の実装: フォーカスアウト時に即座に保存
   - 課題: 複数セルを連続編集する際、1セルごとにAPIリクエストが発行される
   - 改善案:
     - 300ms程度のデバウンスを導入し、連続入力時のAPI呼び出しを削減
     - または、一定時間内の変更をバッチ化して一度にAPI送信
     - 保存状態のビジュアルフィードバック強化（保存中/保存済みインジケーター）
   - 関連ファイル:
     - `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx` (handleQtyChange)
     - `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
   - 優先度: 高（ユーザー体験向上のため）

5. [ ] **フェーズ4: 出荷日とリードタイム管理**
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
- [x] 成績書日付の保存とオートセーブ実装
- [x] 納入先追加機能とマスタ自動同期の実装
- [ ] 残課題: 納入先追加の反映遅延問題
- [ ] 残課題: ロット重複時のエラーハンドリング
- [ ] フェーズ3: アーカイブと履歴データ管理
- [ ] フェーズ4: 出荷日とリードタイム管理
- [x] フェーズ5-1: 納入先別月次集計
- [ ] フェーズ5: 集計とレポート
- [ ] フェーズ6: マスターデータ管理
- [ ] フェーズ7: ショートカットと検索の強化
- [ ] フェーズ8: 単位管理の検討（保留）
- [ ] **フェーズ9: 追加機能（ロット備考、数量別コメント、手動出荷日）**
    - [ ] DBマイグレーション（lot_receipts.remarks, allocation_suggestions.comment/manual_shipment_date）
    - [ ] `LotSection` への備考エリア追加
    - [ ] `DateGrid` への数量別コメント（右クリック+赤▲）実装
    - [ ] 手動出荷日のガード下表示実装
- [ ] **フェーズ10: UI修正 & ロット分割**
    - [ ] 納入先5件以下の罫線バグ修正
    - [ ] ロット分割（分納）API & ダイアログ実装
- [ ] **フェーズ11: 理由付き在庫調整**
    - [ ] 入庫数編集時の理由入力ダイアログ実装
