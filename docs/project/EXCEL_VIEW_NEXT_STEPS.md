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

## 📋 次のフェーズ

### **推奨: Excel View フェーズ1 - 視覚的改善とステータス管理**

詳細な計画は `docs/project/EXCEL_VIEW_IMPROVEMENT_PLAN.md` を参照してください。

#### フェーズ1.1: ロットステータスの視覚的インジケーター強化

**目標:** 未入荷・使用不可ロットを即座に認識可能にする

**タスク:**
1. 新しいロットステータスを追加: `PENDING_RECEIPT`（未入荷）
   - 入荷日なしまたは未来日のロットを検出
2. ステータスバッジスタイルを強化:
   - `pending-receipt` バリアントを琥珀色/警告色で追加
   - 使用不可ロット（Expired、Rejected、QC Hold、Pending Receipt）にロックアイコンを追加
3. `LotSection.tsx` の背景色を更新:
   - 未入荷には `bg-amber-100/80`（目立つ琥珀色）
   - 既存ステータス色を濃くして視認性向上
   - 使用不可ロットに控えめなロックアイコンオーバーレイを追加
4. `LotTable.tsx` の行ハイライトを新ステータス色で更新

**重要ファイル:**
- `frontend/src/shared/utils/status.ts`
- `frontend/src/components/ui/status-badge.tsx` (or `frontend/src/shared/components/data/StatusBadge.tsx`)
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/LotTable.tsx`

**推定工数:** 1-2時間

---

#### フェーズ1.2: 日付表示のタイムゾーン修正

**目標:** タイムゾーン処理による日付オフセット問題（1日ズレ）を修正

**タスク:**
1. `DatePicker` コンポーネントの日付処理を調査
2. 日付のシリアライズをタイムゾーン変換なしの `YYYY-MM-DD` 形式に更新
3. バックエンドの日付解析を確認・修正（UTCに依存しない日付処理を保証）
4. 日付のラウンドトリップをテスト: 入力 → 保存 → 表示

**重要ファイル:**
- `frontend/src/components/ui/date-picker.tsx`
- `backend/app/schemas/lot_schema.py`
- `backend/app/repositories/lot_repository.py`

**検証:**
- 納期日 2026-03-15 でロット作成 → 2026-03-15 と表示されること（2026-03-14 や 2026-03-16 でないこと）を確認
- 複数タイムゾーンで納期日を編集し、一貫性を確認

**推定工数:** 1-2時間

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
- [ ] フェーズ1.1: ロットステータスの視覚的インジケーター強化
- [ ] フェーズ1.2: 日付表示のタイムゾーン修正
- [ ] フェーズ2: 編集・削除操作（右クリックメニュー）
- [ ] フェーズ3: アーカイブと履歴データ管理
- [ ] フェーズ4: 出荷日とリードタイム管理
- [ ] フェーズ5: 集計とレポート
- [ ] フェーズ6: マスターデータ管理
- [ ] フェーズ7: ショートカットと検索の強化
- [ ] フェーズ8: 単位管理の検討（保留）
