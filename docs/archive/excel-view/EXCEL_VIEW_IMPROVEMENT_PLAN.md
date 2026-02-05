# 実装計画: 新規ロット追加後の画面更新問題の修正

## 現在の状況 (2026-02-03)

以下の主要な改善と修正を完了しました：
- **オートセーブの導入:** 数量入力、成績書日付、その他ロット情報をフォーカスアウト時に自動保存。
- **入力安定性の向上:** セル単位でのローカルステート導入により、入力中のフォーカス喪失を解消。
- **納入先追加の永続化:** 数量0の状態でもマッピングを保持するようにバックエンドを調整。
- **マスタ自動連携:** Excel View での納入先追加が「得意先品番マスタ」にも自動反映されるよう同期機能を実装。

## 緊急修正: 新規ロット追加後に画面に表示されない

### 問題の詳細

**現象:**
- QuickLotIntakeDialogで新規ロットを追加
- 追加は成功する（成功トーストが表示される）
- しかし、ExcelViewPageの画面に新規ロットが表示されない

**根本原因:**
`QuickLotIntakeDialog`の`onSuccess`ハンドラーが、必要なすべてのTanStack Queryキャッシュを無効化していない。

**不足している無効化:**
1. `inventoryItemKeys` - 在庫サマリー（ヘッダー情報）
2. `allocationSuggestions` - 割付提案データ
3. より包括的な`lots`キャッシュ無効化

### 修正内容

#### 修正ファイル: `QuickLotIntakeDialog.tsx`

**現在のコード（Lines 165-177）:**
```typescript
const createLotMutation = useMutation({
  mutationFn: createLot,
  onSuccess: () => {
    toast.success("新規ロットを登録しました");
    queryClient.invalidateQueries({ queryKey: ["lots"] });  // ← 不十分
    queryClient.invalidateQueries({ queryKey: intakeHistoryKeys.all });
    onSuccess?.();
    onOpenChange(false);
  },
  ...
});
```

**修正後:**
```typescript
const createLotMutation = useMutation({
  mutationFn: createLot,
  onSuccess: () => {
    toast.success("新規ロットを登録しました");

    // すべての関連キャッシュを無効化
    queryClient.invalidateQueries({ queryKey: ["lots"] });
    queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
    queryClient.invalidateQueries({ queryKey: intakeHistoryKeys.all });

    onSuccess?.();
    onOpenChange(false);
  },
  ...
});
```

### 技術的詳細

#### 1. ExcelViewPageのデータ取得構造

ExcelViewPageは複数のクエリを使用：

**a. Inventory Items（在庫サマリー）**
```typescript
const { data: inventoryData } = useInventoryItems({
  supplier_item_id: productId,
  limit: 100,
});
// クエリキー: ["inventoryItems", "list", params]
```

**b. Lots（ロットデータ）**
```typescript
const { data: lots } = useLotsQuery({
  supplier_item_id: productId,
  status: "active",
  with_stock: true,
});
// クエリキー: ["lots", params]
```

**c. Allocation Suggestions（割付提案）**
```typescript
const { data: suggestionResponse } = useAllocationSuggestions({
  supplier_item_id: productId,
  customer_id: customerItem?.customer_id,
});
// クエリキー: ["allocationSuggestions", params]
```

#### 2. キャッシュ無効化の仕組み

TanStack Queryの`invalidateQueries`は**プレフィックスマッチング**を使用：

```typescript
queryClient.invalidateQueries({ queryKey: ["lots"] });
// マッチ: ["lots"], ["lots", {...params}], ["lots", "detail", ...]
```

しかし、異なるルートキー（`["inventoryItems"]`, `["allocationSuggestions"]`）は個別に無効化する必要がある。

### 実装手順

1. **QuickLotIntakeDialog.tsxの修正**
   - `onSuccess`ハンドラーに以下を追加：
     ```typescript
     queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
     queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
     ```

2. **動作確認**
   - 新規ロットを追加
   - ExcelViewPageで即座に新規ロットが表示されることを確認
   - ヘッダーの在庫サマリーも更新されることを確認
   - 割付提案も更新されることを確認

### 検証シナリオ

1. ExcelViewPageを開く
2. 「新規ロット入庫」ボタンをクリック
3. QuickLotIntakeDialogで新規ロットを作成
4. ✅ ダイアログが閉じる
5. ✅ 成功トーストが表示される
6. ✅ **新規ロットがExcelViewPageに即座に表示される**
7. ✅ ヘッダーの入庫数量も更新される
8. ✅ 割付提案セクションも更新される

### 重要ファイル

- `frontend/src/features/inventory/components/QuickLotIntakeDialog.tsx` (Lines 165-177)
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts` (Lines 135-166)
- `frontend/src/features/inventory/hooks/index.ts` (Lines 27-33)
- `frontend/src/features/allocations/hooks/api/useAllocationSuggestions.ts`

---

# 以前の計画: Excelビュー改善（ロット帳システム改善）

## 概要

本計画は、会議でのユーザーフィードバックに基づき、Excelビューの包括的な改善を実装します。焦点は、使いやすさ、視覚化、データ管理、レポート機能の向上です。

**注意:** 以下のフェーズは、上記の緊急修正完了後に実施予定です。

## 探索結果サマリー

Excelビューは以下のように構造化されています：
- **メインコンポーネント:** `ExcelViewPage.tsx` - 日付列を持つExcel風テーブル
- **現在の機能:** リアルタイム編集、ステータスバッジ（Available/Expired/Rejected/QC Hold/Empty）、日付別割付提案、出荷先トラッキング
- **データフロー:** ポータル選択（仕入先 → 得意先品番 → 倉庫）→ ロットセクション付きExcelビュー
- **不足している主要機能:** 右クリック操作、アーカイブ機能、出荷日管理、集計レポート、マスターデータのインポート/エクスポート

## 実装フェーズ

### フェーズ1: 視覚的改善とステータス管理（優先度: 高）

#### 1.1 ロットステータスの視覚的インジケーター強化

**目標:** 未入荷・使用不可ロットを即座に認識可能にする

**タスク:**
- 新しいロットステータスを追加: `PENDING_RECEIPT`（未入荷）
- `frontend/src/shared/utils/status.ts` を更新して未入荷ロットを検出（入荷日なしまたは未来日）
- `frontend/src/components/ui/status-badge.tsx` のステータスバッジスタイルを強化:
  - `pending-receipt` バリアントを琥珀色/警告色で追加
  - 使用不可ロット（Expired、Rejected、QC Hold、Pending Receipt）にロックアイコンを追加
- `LotSection.tsx` の背景色を更新:
  - 未入荷には `bg-amber-100/80`（目立つ琥珀色）
  - 既存ステータス色を濃くして視認性向上
  - 使用不可ロットに控えめなロックアイコンオーバーレイを追加
- `LotTable.tsx` の行ハイライトを新ステータス色で更新

**重要ファイル:**
- `frontend/src/shared/utils/status.ts`
- `frontend/src/components/ui/status-badge.tsx`
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/LotTable.tsx`

#### 1.2 日付表示のタイムゾーン修正

**目標:** タイムゾーン処理による日付オフセット問題（1日ズレ）を修正

**タスク:**
- `DatePicker` コンポーネントの日付処理を調査
- 日付のシリアライズをタイムゾーン変換なしの `YYYY-MM-DD` 形式に更新
- バックエンドの日付解析を確認・修正（UTCに依存しない日付処理を保証）
- 日付のラウンドトリップをテスト: 入力 → 保存 → 表示

**重要ファイル:**
- `frontend/src/components/ui/date-picker.tsx`
- `backend/app/schemas/lot_schema.py`
- `backend/app/repositories/lot_repository.py`

**検証:**
- 納期日 2026-03-15 でロット作成 → 2026-03-15 と表示されること（2026-03-14 や 2026-03-16 でないこと）を確認
- 複数タイムゾーンで納期日を編集し、一貫性を確認

---

### フェーズ2: 編集・削除操作（優先度: 高）

#### 2.1 コンテキストメニュー（右クリック）アクション

**目標:** 編集/削除操作のための直感的な右クリックメニューを追加

**タスク:**
- 新規コンポーネントを作成: `frontend/src/components/ui/context-menu.tsx`（shadcn/ui）
- `LotSection.tsx` にコンテキストメニューを実装:
  - ロット行を右クリック → 「編集」「削除」「アーカイブ」オプション付きメニュー
  - 削除アクションを確認ダイアログでガード
  - `deleteLot` API を楽観的更新で呼び出し
- `DateGrid.tsx` のセルにコンテキストメニューを追加:
  - 日付セルを右クリック → 「日付編集」「列削除」「割付クリア」
  - 日付編集はインライン日付ピッカーを開く
  - 列削除は予測日をグローバルに削除（ユーザーに確認）
- 確認ダイアログコンポーネントを追加: `ConfirmDialog.tsx`

**重要ファイル:**
- `frontend/src/components/ui/context-menu.tsx`（新規）
- `frontend/src/components/ui/confirm-dialog.tsx`（新規）
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`

#### 2.2 ダブルクリック編集の強化

**目標:** ダブルクリックトリガーでインライン編集UXを改善

**タスク:**
- `LotInfoGroups.tsx` にダブルクリックハンドラーを追加:
  - ロット番号/入荷日をダブルクリック → インライン編集モード
  - 入力フィールドを自動フォーカス
  - ESCでキャンセル、Enterで保存
- `DateGrid.tsx` の数量セルにダブルクリックを追加:
  - すでにクリック編集をサポート、ホバー時に編集アイコンを追加
  - セルのフォーカスリングの視認性を向上
- `ProductHeader.tsx` の納入先行にダブルクリックを追加:
  - ダブルクリック → 事前入力されたデータで納入先編集モーダルを開く

**重要ファイル:**
- `frontend/src/features/inventory/components/excel-view/subcomponents/LotInfoGroups.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
- `frontend/src/features/inventory/components/excel-view/ProductHeader.tsx`

**検証:**
- ロット行を右クリック → 削除 → 確認 → ビューからロットが削除される
- 日付列を右クリック → 削除 → 確認 → すべてのロットから列が削除される
- ロット番号をダブルクリック → インライン編集 → 保存 → データベースに更新される

---

### フェーズ3: アーカイブと履歴データ管理（優先度: 中）

#### 3.1 アーカイブ機能

**目標:** 古いロットをアーカイブビューに移動して画面を整理

**タスク:**
- **バックエンド変更:**
  - [ ] `lots` テーブルに `archived_at` タイムスタンプ列を追加
  - [ ] マイグレーション作成: `alembic revision --autogenerate -m "add_archived_at_to_lots"`
  - [ ] `LotRepository.get_active_lots()` を更新してデフォルトでアーカイブ済みロットを除外
  - [ ] 新メソッド追加: `LotRepository.get_archived_lots()`
  - [ ] エンドポイント追加: `POST /api/lots/{lot_id}/archive`（archived_at を現在時刻に設定）
  - [ ] エンドポイント追加: `POST /api/lots/{lot_id}/unarchive`（archived_at を null に設定）

- **フロントエンド変更:**
  - [x] `LotSection.tsx` のコンテキストメニューにアーカイブボタンを追加
  - [x] `LotSection.tsx` の右上にアーカイブ/削除アイコンを追加
  - [x] 在庫が残っているロットはロット番号入力確認付きでアーカイブ
  - [ ] `ExcelViewPage.tsx` にタブスイッチャーを作成:
    - 「アクティブロット」（デフォルト）- 非アーカイブロットを表示
    - 「アーカイブ」- アーカイブ済みロットを表示
  - [ ] `useExcelViewData()` フックにフィルターを追加してタブに基づいてアーカイブ済み/アクティブを取得
  - [ ] 「1ヶ月以上前のロットをアーカイブ」一括アクションボタンを追加
  - [ ] 一括アーカイブの確認ダイアログを実装

**重要ファイル:**
- `backend/app/models/lot_models.py`
- `backend/alembic/versions/`（新規マイグレーションファイル）
- `backend/app/repositories/lot_repository.py`
- `backend/app/api/routes/lot_router.py`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/hooks/useExcelViewData.ts`

#### 3.2 折りたたみグループとフィルタリング

**目標:** 折りたたみ可能なロットグループで視覚的な散らかりを削減

**タスク:**
- `ProductHeader.tsx` に折りたたみ/展開トグルを追加（すでに納入先の折りたたみあり）
- `ExcelViewPage.tsx` ヘッダーに「すべて折りたたむ」/「すべて展開」ボタンを追加
- ユーザー設定の永続化（localStorage）を実装:
  - 製品/倉庫の組み合わせごとに折りたたみ状態を保存
  - ページ再読み込み時に復元
- Excelビュー上部にフィルターコントロールを追加:
  - ステータスフィルター: すべて / 利用可能のみ / 期限切れ除外 / QC Hold除外
  - 日付範囲フィルター: 入荷日範囲内のロットを表示
  - 検索フィルター: ロット番号または入荷参照番号でフィルター

**重要ファイル:**
- `frontend/src/features/inventory/components/excel-view/ProductHeader.tsx`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/hooks/useExcelViewData.ts`

**検証:**
- 10個以上のロットでExcelビューに移動 → 5個の古いロットをアーカイブ → アーカイブタブに切り替え → 5個のアーカイブロットを確認
- 「すべて折りたたむ」をクリック → すべてのロットセクションが折りたたまれる → 「すべて展開」をクリック → すべて展開される
- 「利用可能のみ」でフィルター → 期限切れ/QC Holdロットが非表示

---

### フェーズ4: 出荷日とリードタイム管理（優先度: 高）

#### 4.1 出荷日設定

**目標:** リードタイムに基づいて出荷日を自動計算

**タスク:**
- **バックエンド変更:**
  - `delivery_places` テーブルに `lead_time_days` 列を追加（整数、nullable）
  - マイグレーション作成: `alembic revision --autogenerate -m "add_lead_time_to_delivery_places"`
  - `DeliveryPlaceSchema` を更新して `lead_time_days` を含める
  - 割付サービスに自動計算ロジックを追加:
    - 割付提案作成時に `shipment_date = forecast_date - lead_time_days` を計算
    - `allocation_suggestions.shipment_date`（新列）に保存

- **フロントエンド変更:**
  - 納入先編集フォームに「リードタイム（日数）」フィールドを追加
  - `DateGrid.tsx` セルに出荷日を表示（薄いグレー、数量の下に小さいフォント）
  - 手動の出荷日上書きを追加:
    - 日付セルを右クリック → 「出荷日を上書き」→ 日付ピッカー
    - 上書きを `allocation_suggestions.shipment_date_override` に保存
  - `ShipmentTable.tsx` を更新して納入先ごとのリードタイムと計算された出荷日を表示

**重要ファイル:**
- `backend/app/models/delivery_place_models.py`
- `backend/alembic/versions/`（新規マイグレーションファイル）
- `backend/app/models/allocation_models.py`（shipment_date列を追加）
- `backend/app/services/allocation_service.py`
- `frontend/src/features/delivery-places/components/DeliveryPlaceForm.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx`

#### 4.2 出荷日表示オプション

**目標:** 出荷日の表示を柔軟に制御

**タスク:**
- `ExcelViewPage.tsx` ヘッダーにトグルを追加:「出荷日を表示」（デフォルト: オン）
- トグル状態をユーザーごとに localStorage に永続化
- トグルに基づいて `DateGrid.tsx` セルの出荷日を条件付きでレンダリング
- 出荷日上書きのある日付にビジュアルインジケーター（トラックアイコン）を追加

**重要ファイル:**
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx`

**検証:**
- 納入先のリードタイム = 3日に設定 → 予測日 2026-03-10 → 出荷日が 2026-03-07 に自動計算される
- 日付セルを右クリック → 出荷日を上書き → 2026-03-06 に設定 → トラックアイコンが表示される
- 「出荷日を表示」をオフに切り替え → 出荷日が非表示

---

### フェーズ5: 集計とレポート（優先度: 高）

#### 5.1 納入先別月次集計

**目標:** 納入先ごとの月次出荷数量を自動集計

**タスク:**
- **バックエンド変更:**
  - [x] エンドポイント追加: `GET /api/reports/monthly-by-destination`
    - クエリパラメータ: `product_id`、`warehouse_id`、`year`、`month`
    - 戻り値: {destination_name、customer_name、total_quantity、lot_count} のリスト
  - [x] 新サービス作成: `ReportService.get_monthly_aggregation_by_destination()`
    - delivery_place_id でグループ化された allocation_suggestions をクエリ
    - 月内の forecast_period でフィルター（YYYY-MM/日付のプレフィックス）
    - 割付数量を合計

- **フロントエンド変更:**
  - [x] 新ページ作成: `frontend/src/features/reports/components/MonthlyReportPage.tsx`
  - [x] GlobalNavigation.tsx にナビゲーション項目を追加:「月次レポート」（月次集計）
  - [x] UIコンポーネント:
    - 月ピッカー（年 + 月セレクター）
    - 製品/倉庫セレクター
    - 集計テーブル: 納入先 | 得意先 | 合計数量 | ロット数
    - Excelにエクスポートボタン（CSVダウンロード）
  - [x] MainRoutes.tsx にルートを追加: `/reports/monthly`

**重要ファイル:**
- `backend/app/api/routes/report_router.py`（新規）
- `backend/app/services/report_service.py`（新規）
- `frontend/src/features/reports/components/MonthlyReportPage.tsx`（新規）
- `frontend/src/features/reports/api.ts`（新規）
- `frontend/src/MainRoutes.tsx`
- `frontend/src/features/navigation/GlobalNavigation.tsx`

#### 5.2 月跨ぎロット処理

**目標:** ロットを分割せずに複数月にまたがる対応

**タスク:**
- 月次集計ロジックを更新:
  - lot_id と月でグループ化して割付を集計
  - 各月内でロット内訳を表示
  - received_date < 月初の場合、「前月からのロット継続」インジケーターを表示
- 「複数月ビュー」オプションを追加:
  - 日付範囲を選択（開始月から終了月まで）
  - すべての月にわたる納入先ごとの集計数量を表示
  - 折りたたみ可能な行で月別内訳を表示

**重要ファイル:**
- `backend/app/services/report_service.py`
- `frontend/src/features/reports/components/MonthlyReportPage.tsx`

**検証:**
- 2月に入荷したロット、2月に5kg、3月に3kg割付 → 月次レポート 2月: 5kg、3月: 3kg
- 複数月ビュー 2月-3月 → 合計8kgと月別内訳表示

---

### フェーズ6: マスターデータ管理（優先度: 中）

#### 6.1 マスターデータのExcelインポート/エクスポート

**目標:** Excelでマスターデータの一括登録・更新

**タスク:**
- **バックエンド変更:**
  - 各マスタータイプのエンドポイントを追加:
    - `POST /api/masters/{master_type}/import`（Excelアップロード）
    - `GET /api/masters/{master_type}/export`（Excelダウンロード）
  - `openpyxl`（Pythonライブラリ）を使用してExcel解析を実装
  - バリデーション: 必須フィールド、重複キー、外部キー参照をチェック
  - インポート結果を返す: {success_count、error_count、errors: [{row、field、message}]}

- **フロントエンド変更:**
  - マスターページを更新してインポート/エクスポートボタンを追加:
    - `/features/suppliers/components/SupplierListPage.tsx`
    - `/features/customers/components/CustomerListPage.tsx`
    - `/features/delivery-places/components/DeliveryPlaceListPage.tsx`
    - `/features/supplier-products/components/SupplierProductListPage.tsx`
  - 再利用可能なコンポーネントを作成: `MasterImportExportButtons.tsx`
  - インポートフロー:
    - インポートをクリック → ファイルピッカー → アップロード → ダイアログでバリデーション結果を表示
    - 行番号とメッセージでエラーを表示
    - エラーがある場合インポートを確認（エラー行をスキップまたは中断）
  - エクスポートフロー:
    - エクスポートをクリック → 現在のデータでExcelをダウンロード
    - 列の説明付きテンプレート行を含める

**重要ファイル:**
- `backend/app/api/routes/master_router.py`（新規）
- `backend/app/services/master_import_service.py`（新規）
- `frontend/src/features/masters/components/MasterImportExportButtons.tsx`（新規）
- `frontend/src/features/suppliers/components/SupplierListPage.tsx`
- `frontend/src/features/customers/components/CustomerListPage.tsx`
- `frontend/src/features/delivery-places/components/DeliveryPlaceListPage.tsx`

#### 6.2 品番マッピングの強化

**目標:** 双方向品番マッピングで検索を改善

**タスク:**
- **バックエンド変更:**
  - `customer_items` テーブルを更新して双方向検索を確保:
    - `customer_part_no` と `maker_part_no` の両方にインデックス
  - エンドポイント追加: `GET /api/customer-items/search?q={query}`
    - `customer_part_no` と `maker_part_no` の両方で検索
    - 両品番を含むマッチした得意先品番を返す

- **フロントエンド変更:**
  - 製品検索コンポーネントを更新して新しい検索エンドポイントを使用
  - 検索結果に両品番を表示:
    - 「得意先品番: XXX（メーカー品番: YYY）」またはその逆
  - ExcelPortalの得意先品番セレクターを更新して両品番を表示

**重要ファイル:**
- `backend/app/repositories/customer_item_repository.py`
- `backend/app/api/routes/customer_item_router.py`
- `frontend/src/features/customer-items/api.ts`
- `frontend/src/features/inventory/components/ExcelPortalPage.tsx`

**検証:**
- 得意先品番「ABC123」を検索 → メーカー品番「XYZ789」の製品を発見 → 両方表示
- メーカー品番「XYZ789」を検索 → 得意先品番「ABC123」を発見 → 両方表示

---

### フェーズ7: ショートカットと検索の強化（優先度: 低）

#### 7.1 個人用製品ショートカット

**目標:** 頻繁にアクセスする製品への素早いナビゲーション

**タスク:**
- **バックエンド変更:**
  - 新テーブル作成: `user_product_shortcuts`
    - 列: id、user_id、product_id、warehouse_id、shortcut_number（1-9）、created_at
    - ユニーク制約: (user_id、shortcut_number)
  - エンドポイント追加:
    - `GET /api/user-shortcuts` - ユーザーのショートカットを一覧表示
    - `POST /api/user-shortcuts` - ショートカットを作成
    - `DELETE /api/user-shortcuts/{id}` - ショートカットを削除

- **フロントエンド変更:**
  - ExcelViewPage ヘッダーに「★ ショートカットに追加」ボタンを追加
  - ショートカットダイアログを作成:「ショートカット番号（1-9）を割り当て」
  - GlobalNavigation サイドバーにショートカットを表示:
    - 折りたたみ可能な「マイショートカット」セクション
    - 各ショートカット:「製品名 @ 倉庫（ショートカット: 3）」
    - クリック → Excelビューに移動
  - キーボードショートカットを追加: Alt+[1-9] → ショートカットNに移動

**重要ファイル:**
- `backend/app/models/user_shortcut_models.py`（新規）
- `backend/app/api/routes/user_shortcut_router.py`（新規）
- `frontend/src/features/user-shortcuts/`（新規フィーチャーモジュール）
- `frontend/src/features/navigation/GlobalNavigation.tsx`
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`

#### 7.2 品番検索の強化

**目標:** メーカー品番と得意先品番の両方で検索

**タスク:**
- フェーズ6.2（品番マッピングの強化）で既にカバー済み
- 追加の改善:
  - GlobalNavigation ヘッダーに検索バーを追加
  - グローバル検索: 品番を入力 → マッチした製品の即時ドロップダウン
  - 結果をクリック → Excelビューまたは製品詳細に移動
  - マッチタイプを表示:「メーカー品番」または「得意先品番」

**重要ファイル:**
- `frontend/src/features/navigation/GlobalNavigation.tsx`
- `frontend/src/components/ui/command.tsx`（shadcn/ui コマンドパレット）

**検証:**
- 番号3で製品をショートカットに追加 → Alt+3 → Excelビューに移動
- グローバル検索で得意先品番を入力 → マッチした製品を確認 → クリック → Excelビューに移動

---

### フェーズ8: 単位管理の検討（優先度: 低 - 保留）

#### 8.1 複数単位システムのレビュー

**目標:** システム全体の単位管理戦略を明確化

**現状:**
- システムに複数の単位コンテキストあり: メーカー単位、社外単位、製品単位、OCR単位、SAP単位
- 現在の表示: ロット一覧でメーカー単位のみ表示

**提案アクション:**
- **ステークホルダーとの今後の議論のため保留**
- 検討すべき選択肢:
  1. Excelビューに複数の単位列を追加（表示設定可能）
  2. システム全体で単一単位に標準化（データ移行が必要）
  3. 単位換算テーブルを追加（マスターデータ）
  4. 主要単位のみ表示、ホバー/ツールチップで換算を表示

**タスク（再開時）:**
- システム全体の単位使用を調査（在庫、注文、OCR、SAP連携）
- 希望する表示形式についてステークホルダーにインタビュー
- 単位管理UIを設計（システム設定に配置可能）
- 選択したアプローチを移行パスとともに実装

**重要ファイル（将来）:**
- `backend/app/models/lot_models.py`（単位フィールドを追加する可能性）
- `frontend/src/features/inventory/components/excel-view/`（表示ロジック）
- `frontend/src/features/system-settings/`（単位設定）

---

## 実装順序と依存関係

### スプリント1（第1-2週）: 高優先度の視覚的改善とコア機能
1. フェーズ1: 視覚的改善とステータス管理
2. フェーズ2: 編集・削除操作
3. フェーズ4: 出荷日とリードタイム管理

### スプリント2（第3-4週）: データ管理とレポート
4. フェーズ3: アーカイブと履歴データ管理
5. フェーズ5: 集計とレポート
6. フェーズ6.1: マスターデータのExcelインポート/エクスポート

### スプリント3（第5週）: 検索と仕上げ
7. フェーズ6.2: 品番マッピングの強化
8. フェーズ7.1: 個人用製品ショートカット
9. フェーズ7.2: 品番検索の強化

### 将来のスプリント:
10. フェーズ8: 単位管理の検討（保留）

---

## 重要ファイル一覧

### バックエンド（Python）
- `backend/app/models/lot_models.py` - archived_at列を追加
- `backend/app/models/delivery_place_models.py` - lead_time_days列を追加
- `backend/app/models/allocation_models.py` - shipment_date列を追加
- `backend/app/repositories/lot_repository.py` - アーカイブメソッド
- `backend/app/services/allocation_service.py` - 出荷日計算
- `backend/app/services/report_service.py`（新規）- 月次集計
- `backend/app/services/master_import_service.py`（新規）- Excelインポート/エクスポート
- `backend/app/api/routes/lot_router.py` - アーカイブエンドポイント
- `backend/app/api/routes/report_router.py`（新規）- レポートエンドポイント
- `backend/app/api/routes/master_router.py`（新規）- マスターインポート/エクスポート

### フロントエンド（TypeScript）
- `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx` - アーカイブタブ、フィルター、出荷日トグル
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx` - コンテキストメニュー、ステータス色
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx` - 出荷日表示、コンテキストメニュー
- `frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx` - リードタイム表示
- `frontend/src/features/inventory/hooks/useExcelViewData.ts` - アーカイブフィルタリング
- `frontend/src/components/ui/context-menu.tsx`（新規）- 右クリックメニュー
- `frontend/src/components/ui/confirm-dialog.tsx`（新規）- 確認ダイアログ
- `frontend/src/features/reports/components/MonthlyReportPage.tsx`（新規）- 月次集計UI
- `frontend/src/features/masters/components/MasterImportExportButtons.tsx`（新規）- インポート/エクスポートUI
- `frontend/src/features/user-shortcuts/`（新規）- ショートカット管理
- `frontend/src/features/navigation/GlobalNavigation.tsx` - ショートカット表示、グローバル検索
- `frontend/src/shared/utils/status.ts` - PENDING_RECEIPTステータスを追加

### データベースマイグレーション
- `backend/alembic/versions/XXXX_add_archived_at_to_lots.py`（新規）
- `backend/alembic/versions/XXXX_add_lead_time_to_delivery_places.py`（新規）
- `backend/alembic/versions/XXXX_add_shipment_date_to_allocations.py`（新規）
- `backend/alembic/versions/XXXX_create_user_product_shortcuts.py`（新規）

---

## 検証とテスト戦略

### エンドツーエンドテストシナリオ

#### シナリオ1: 視覚的ステータスインジケーター
1. 入荷日なしでロット作成 → ステータスバッジが「未入荷」（琥珀色）とロックアイコンを表示
2. Excelビューに移動 → ロットセクションが琥珀色の背景
3. 期限切れ日付でロット作成 → ステータスバッジが「期限切れ」（赤）とロックアイコンを表示
4. QC Holdにマークするようロットを編集 → 背景が琥珀色に変更、ロックアイコンが表示

#### シナリオ2: 編集・削除操作
1. ロット行を右クリック → 「削除」を選択 → 確認 → ビューからロット削除
2. 日付列を右クリック → 「列削除」を選択 → 確認 → すべてのロットから列削除
3. ロット番号をダブルクリック → インライン編集 → Enterキー → データベースに更新
4. 数量セルをダブルクリック → 編集 → Enterキー → 割付提案が更新

#### シナリオ3: アーカイブ管理
1. 10個のロットでExcelビューに移動 → 「1ヶ月以上前のロットをアーカイブ」をクリック → 確認 → 5個のロットがアーカイブに移動
2. 「アーカイブ」タブに切り替え → 5個のアーカイブロットを確認
3. アーカイブロットを右クリック → 「アーカイブ解除」を選択 → ロットがアクティブタブに戻る
4. ページを再読み込み → アーカイブ状態が維持

#### シナリオ4: 出荷日計算
1. 納入先のリードタイム = 3日に設定
2. 予測日 2026-03-10 の割付提案を追加
3. 出荷日が 2026-03-07 に自動計算（日付グリッドセルに表示）
4. 日付セルを右クリック → 出荷日を上書き → 2026-03-06 に設定 → トラックアイコンが表示
5. 「出荷日を表示」をオフに切り替え → 出荷日が非表示

#### シナリオ5: 月次集計レポート
1. 「月次レポート」ページに移動
2. 製品、倉庫、year=2026、month=3を選択
3. 納入先と合計数量の集計テーブルを表示
4. 「Excelにエクスポート」をクリック → レポートデータのCSVがダウンロード
5. 複数月範囲（2-3月）を選択 → 月別内訳を伴う合計を確認

#### シナリオ6: マスターデータインポート
1. 仕入先ページに移動 → 「インポート」をクリック → 10仕入先のExcelをアップロード
2. バリデーション結果を確認: 8成功、2エラー（仕入先コード重複）
3. ダイアログでエラーを確認 → インポートを確認 → 8仕入先が作成
4. 「エクスポート」をクリック → 現在のすべての仕入先のExcelをダウンロード

#### シナリオ7: 製品ショートカット
1. 製品A @ 倉庫1のExcelビューに移動
2. 「★ ショートカットに追加」をクリック → 番号5を割り当て
3. ショートカットがGlobalNavigationサイドバーに表示:「製品A @ 倉庫1（5）」
4. Alt+5キー → Excelビューに直接移動
5. サイドバーのショートカットをクリック → Excelビューに移動

#### シナリオ8: 強化された検索
1. グローバル検索バーに得意先品番「ABC123」を入力
2. マッチした製品のドロップダウンを確認:「ABC123（メーカー: XYZ789）」
3. 結果をクリック → その製品のExcelビューに移動
4. メーカー品番「XYZ789」を入力 → 得意先品番表示で同じ製品が表示

### 各フェーズ完了前の品質チェック
- `make quality-check`（lint、format、typecheck、tests）を実行
- バックエンドスキーマ変更後に `make frontend-typegen` を実行
- ブラウザですべてのユーザーフローをテスト（Chrome/Firefox/Safari）
- データベースマイグレーションのup/downを検証
- コンソールでエラー/警告をチェック
- キーボードショートカットとアクセシビリティをテスト
- モバイルレスポンシブを検証（該当する場合）

---

## リスク評価と軽減策

### 高リスク領域

#### 1. データベーススキーマ変更（フェーズ3、4）
**リスク:** 本番環境でのマイグレーション失敗、データ損失
**軽減策:**
- 本番データベースのコピーでマイグレーションをテスト
- 各マイグレーションのロールバックスクリプトを作成
- 安全なマイグレーショントランザクションに `db.begin_nested()` を使用
- トラフィックの少ない時間帯にマイグレーションをスケジュール

#### 2. タイムゾーン処理（フェーズ1.2）
**リスク:** 既存データの破損、日付の不一致
**軽減策:**
- データベースの現在の日付保存形式を監査
- 複数タイムゾーン（JST、UTC、PST）での日付処理をテスト
- 日付のラウンドトリップの自動テストを追加
- 既存の日付を正規化するデータ移行スクリプトを検討

#### 3. Excelインポートバリデーション（フェーズ6.1）
**リスク:** 無効データの一括インポート、外部キー違反
**軽減策:**
- API境界で厳密なバリデーションを実装
- ドライランモード: コミットせずにインポート内容を表示
- バリデーションエラー時はトランザクションロールバック
- インポートバッチサイズを制限（例: 最大1000行）

#### 4. 大規模データセットのパフォーマンス（フェーズ5）
**リスク:** 月次集計クエリが遅い、タイムアウト
**軽減策:**
- `forecast_date`、`delivery_place_id` にデータベースインデックスを追加
- 大きな結果のクエリページネーションを実装
- TTL（5分）で集計結果をキャッシュ
- UIにローディングインジケーターとプログレスバーを追加

### 中リスク領域

#### 5. コンテキストメニューUXの競合（フェーズ2.1）
**リスク:** ブラウザデフォルトとの右クリック競合、誤操作
**軽減策:**
- 破壊的アクション（削除）に確認ダイアログを追加
- Excelビュー内でのみデフォルトのブラウザコンテキストメニューを防止
- 代替としてキーボードショートカットを追加（削除にDelキー）
- 複数ブラウザ（Chrome、Firefox、Safari）でテスト

#### 6. アーカイブ状態管理（フェーズ3.1）
**リスク:** ロットの行方に混乱、誤アーカイブ
**軽減策:**
- 明確なビジュアルインジケーター（「アーカイブ済み」バッジ、別タブ）
- 一括アーカイブアクション後に元に戻すボタンを追加（30秒間）
- 監査証跡のためすべてのアーカイブ/アーカイブ解除アクションをログ
- 一括アーカイブに管理者権限を要求（AccessGuard経由）

---

## セキュリティとアクセス制御の考慮事項

### 管理者専用機能
- 一括アーカイブアクション → `admin` ロールが必要
- マスターデータのインポート/エクスポート → `admin` または `manager` ロールが必要
- ロット削除操作 → `admin` ロールが必要
- 出荷日の上書き → `user` ロール（すべての認証済みユーザー）が必要

### 実装
- ルートレベル保護に `AccessGuard` コンポーネントを使用
- APIエンドポイントに `get_current_admin` 依存関係を使用
- `config.ts` の `routePermissions` に追加:
  ```typescript
  { routeKey: "REPORTS.MONTHLY", path: "/reports/monthly", allowedRoles: ["admin", "manager", "user"] },
  { routeKey: "INVENTORY.EXCEL_VIEW", path: "/inventory/excel-view/:productId/:warehouseId", allowedRoles: ["admin", "user"] },
  ```

### ログ要件
- すべてのアーカイブ/アーカイブ解除アクションを user_id、lot_id、timestamp でログ
- すべてのマスターデータインポートを user_id、record_count、errors でログ
- すべてのロット削除を user_id、lot_id、reason（監査テーブル経由）でログ

---

## パフォーマンス最適化戦略

### クエリ最適化
- インデックスを追加: `lots.archived_at`、`allocation_suggestions.forecast_date`、`delivery_places.lead_time_days`
- Excelビューで関連エンティティの即時ロードを使用（N+1クエリを削減）
- 集計レポート用のクエリ結果キャッシング（RedisまたはインメモリIを実装

### フロントエンド最適化
- 日付列の遅延ロード（`react-window` で仮想化）
- 検索入力をデバウンス（300ms遅延）
- 高コストの変換をメモ化（mapLotBlock、集計計算）
- TanStack Queryのキャッシュ無効化を戦略的に使用（すべての変更ですべてを再取得しない）

### バックエンド最適化
- 割付提案の一括更新（すでに実装済み）
- Excelインポートに一括挿入を使用（executemany）
- すべてのリストエンドポイントにページネーションを実装（デフォルト100件）
- クエリタイムアウト制限を追加（最大30秒）

---

## ロールアウト戦略

### フェーズ1ロールアウト（視覚的改善）
- ステージング環境にデプロイ
- 2-3名のパワーユーザーでユーザー受入テスト
- ステータス色と視認性のフィードバックを収集
- 必要に応じて色を調整（アクセシビリティチェック）
- 本番環境にデプロイ

### フェーズ2-3ロールアウト（編集/削除とアーカイブ）
- ステージングにデプロイ
- 新しいコンテキストメニューとアーカイブ機能をユーザーにトレーニング
- 使用状況分析を監視（アーカイブの使用頻度）
- 告知とともに本番環境にデプロイ

### フェーズ4ロールアウト（出荷日）
- ステージングにデプロイ
- ユーザートレーニングセッション（30分）: リードタイムの設定方法、出荷日の上書き
- 実際の納入先データでテスト
- 詳細なドキュメントとともに本番環境にデプロイ

### フェーズ5ロールアウト（レポート）
- ステージングにデプロイ
- レビュー用のサンプルレポートを生成
- 精度のため既存のExcelベースレポートと比較
- 本番環境にデプロイ
- 月次レポートテンプレート（Excel形式）を作成

### フェーズ6-7ロールアウト（マスターデータとショートカット）
- ステージングにデプロイ
- ユーザートレーニング: Excelインポート/エクスポートテンプレート
- 実際のマスターデータでインポートをテスト
- 本番環境にデプロイ
- ダウンロード用Excelテンプレートを提供

---

## 成功指標

### 定量的指標
- **ロット検索時間:** 平均30秒から10秒に短縮（ショートカット+検索経由）
- **古いデータのアーカイブ時間:** 手動5分から一括アクション10秒に短縮
- **月次レポート生成:** （Excel）30分から自動化2分に短縮
- **マスターデータ更新時間:** 手動入力2時間からExcelインポート10分に短縮
- **エラー率:** マスターデータインポートのバリデーションエラー < 1%

### 定性的指標
- ユーザー満足度調査: Excelビューの使いやすさで4.5/5評価を目標
- ロット管理関連のサポートチケット削減（目標: 50%削減）
- 新機能のユーザー採用: 最初の1ヶ月で80%がアーカイブを使用
- 視覚的ステータスインジケーターへの肯定的フィードバック（ユーザーインタビュー経由）

### 監視と分析
- 機能使用状況を追跡: アーカイブアクション、ショートカット使用、レポート生成頻度
- エラー率を監視: インポートバリデーション失敗、APIエラー、UIクラッシュ
- ユーザーフィードバックを収集: アプリ内フィードバックボタン、四半期調査
- パフォーマンス監視: API応答時間、データベースクエリ時間、フロントエンドロード時間

---

## ドキュメントとトレーニング計画

### ユーザードキュメント（日本語）
- **Excelビューガイド:** すべての機能の完全ウォークスルー（編集、アーカイブ、ショートカット）
- **月次レポートガイド:** レポートの生成方法と解釈方法
- **マスターデータインポートガイド:** Excelテンプレート形式、バリデーションルール、トラブルシューティング
- **出荷日管理:** リードタイムの設定方法、日付の上書き
- **ショートカット設定:** 製品ショートカットの作成と使用方法

### 技術ドキュメント（英語）
- **APIドキュメント:** 新しいエンドポイントでSwagger/ReDocを更新
- **データベーススキーマ変更:** ロールバック手順を含むすべてのマイグレーションを文書化
- **アーキテクチャ決定記録:** 特定のアプローチが選ばれた理由（例: archived_at vs. status enum）
- **トラブルシューティングガイド:** 一般的な問題と解決策（タイムゾーン問題、インポートエラー）

### トレーニングセッション
- **セッション1（1時間）:** Excelビューの強化（編集、削除、アーカイブ、ステータス色）
- **セッション2（45分）:** 出荷日管理とリードタイム
- **セッション3（1時間）:** 月次レポートとデータ分析
- **セッション4（45分）:** マスターデータのインポート/エクスポートとショートカット

### サポートリソース
- 各機能のビデオチュートリアルを作成（各5-10分）
- スクリーンショット付きの社内FAQページを設定
- 他のユーザーを支援するチャンピオンとしてパワーユーザーを指定
- Q&A用の月次オフィスアワーをスケジュール

---

## 未解決の質問と将来の検討事項

### 未解決の質問（実装前に解決）
1. **単位管理（フェーズ8）:** 複数の単位コンテキストの長期的に望ましい解決策は？
2. **アーカイブ保持ポリシー:** アーカイブロットをどのくらい保管すべきか？X年後に自動削除すべきか？
3. **出荷日の上書き:** 手動上書きに承認ワークフローが必要か？
4. **マスターデータインポート権限:** 一括インポートの権限を誰が持つべきか？管理者のみか全ユーザーか？
5. **月次レポート形式:** レポートはPDF、Excel、または両方か？

### 将来の機能強化（実装後）
1. **ロットテンプレート:** クイック入力用のロット設定をテンプレートとして保存
2. **バッチ操作:** 複数ロットを選択して一括編集/アーカイブ/削除
3. **高度なフィルタリング:** カスタムフィルターを「ビュー」として保存（例:「今月期限切れ」）
4. **通知システム:** ロットの期限切れ間近または在庫不足をユーザーに警告
5. **SAPとの統合:** 出荷日とリードタイムのリアルタイム同期
6. **モバイル最適化:** タブレットデバイス用のレスポンシブExcelビュー
7. **共同編集:** 複数ユーザーが同じロットを編集する際のリアルタイム更新
8. **監査証跡UI:** ロットへのすべての変更履歴を表示（誰が、いつ、何を）

---

## 緊急修正: TMPロット非表示とExcelPortal UI改善

### 問題1: TMPロットが表示される

**現象:**
- Excelビューで`TMP-`プレフィックス付きのロット（例: `TMP-20260203-69abe41f`）が表示されている
- `with_stock: true`フィルターがあるにも関わらず表示される

**原因調査が必要:**
- TMPロットはロット番号が空でも登録できるようにした際の一時ロット
- 本来は非表示にすべき

**修正方針:**
1. `useExcelViewData.ts`でTMPロットをフィルタリング
2. ロット番号が`TMP-`で始まるロットを除外
3. または、バックエンドのクエリパラメータに`exclude_tmp=true`を追加

### 問題2: ExcelPortal選択UIの改善

**現在の問題:**
- ステップ2: 「製品・得意先品番」となっているが、製品単位で選択したい
- ステップ3: 倉庫選択が不要（直接Excelビューに遷移したい）

**要件:**
1. **ステップ2を「製品」に変更:**
   - 表示内容: メーカー品番（product_code）、品名（product_name）
   - 得意先品番がある場合は補足情報として表示（例: 「先方品番: XXX」）
   - 得意先でグループ化せず、製品でグループ化

2. **ステップ3（倉庫選択）を削除:**
   - 製品選択後、直接Excelビューに遷移
   - デフォルト倉庫を使用、または全倉庫を統合表示

3. **ルーティング変更:**
   - 現在: `/inventory/excel-view/:productId/:warehouseId/:customerItemId?`
   - 変更後: `/inventory/excel-view/:productId/:customerItemId?`
   - 全倉庫のロットを統合表示（倉庫列で区別可能）

### 修正ファイル

#### TMPロット非表示

**フロントエンド:**
- `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`
  - `mapLotBlock`または`lots`のフィルタリング処理でTMPロットを除外

#### ExcelPortal UI改善

**フロントエンド:**
1. `frontend/src/features/inventory/pages/ExcelPortalPage.tsx`
   - ステップを2段階に変更（supplier → product）
   - ステップ2のUI変更: 製品情報を主体に、得意先品番は副次的に表示
   - 製品選択後の遷移先を変更
   - 倉庫選択ステップを削除

2. `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
   - URLパラメータから`warehouseId`を削除
   - 全倉庫のロットを統合表示

3. `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`
   - `warehouseId`パラメータを削除
   - `warehouse_id`フィルターなしで全倉庫のロットを取得
   - `LotBlockData`に倉庫情報を追加（倉庫名を表示するため）

4. `frontend/src/features/inventory/components/excel-view/LotSection.tsx`
   - ロット情報に倉庫名を表示（例: 「倉庫: 東京倉庫」）

5. ルート定義（`MainRoutes.tsx`）
   - `/inventory/excel-view/:productId/:warehouseId/:customerItemId?` → `/inventory/excel-view/:productId/:customerItemId?`

### 実装順序

1. **緊急修正: TMPロット非表示**（5分）
   - `useExcelViewData.ts`で`lots.filter(lot => !lot.lot_number?.startsWith('TMP-'))`を追加

2. **ExcelPortal UI改善**（45分）
   - ステップ数を3→2に変更
   - ステップ2のUI改善（製品中心の表示、得意先品番は副次的）
   - 倉庫選択ステップ削除
   - 製品選択後、直接Excelビューに遷移（全倉庫統合表示）
   - ルーティング変更（warehouseIdパラメータ削除）

3. **Excelビュー更新**（30分）
   - warehouseIdパラメータを削除
   - 全倉庫のロットを取得・表示
   - ロット情報に倉庫名を追加表示

4. **検証**（10分）
   - TMPロットが非表示になることを確認
   - ExcelPortalで製品選択→直接Excelビューに遷移することを確認
   - 全倉庫のロットが統合表示されることを確認
   - 既存の機能が壊れていないことを確認

### 検証シナリオ

#### TMPロット非表示
1. Excelビューを開く
2. TMPロットが表示されないことを確認
3. 通常のロットは正常に表示されることを確認

#### ExcelPortal UI改善
1. ExcelPortalページを開く
2. ステップ1: 仕入先を選択
3. ステップ2: 製品一覧が表示される
   - メーカー品番と品名が主表示
   - 得意先品番がある場合は補足として表示
4. 製品をクリック → 直接Excelビューに遷移
5. Excelビューで選択した製品のロットが表示される

---

## 元の計画（フェーズ2以降）は保留

フェーズ2以降の実装（右クリックメニュー、ダブルクリック編集など）は、上記の緊急修正完了後に再開します。

**推定修正時間:** 90分（1.5時間）

### 詳細実装手順

#### 1. TMPロット非表示（5分）

**ファイル:** `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`

```typescript
// lots配列をフィルタリングしてTMPロットを除外
const filteredLots = lots.filter(lot =>
  !lot.lot_number || !lot.lot_number.startsWith('TMP-')
);
```

**位置:** `mapLotBlock`を呼び出す前に`lots`配列をフィルタリング

#### 2. ExcelPortalPage UI改善（45分）

**ファイル:** `frontend/src/features/inventory/pages/ExcelPortalPage.tsx`

**変更内容:**
1. **ステップ定義変更:**
   ```typescript
   type Step = "supplier" | "product"; // "customer-item" → "product", "warehouse"削除
   ```

2. **ステップ表示変更:**
   - ステップ2のラベル: 「製品・得意先品番」→「製品」
   - ステップ3を削除

3. **製品選択UI改善（ステップ2）:**
   ```typescript
   // 製品グループごとに表示
   {filteredProductGroups.map((group) => (
     <button onClick={() => handleProductSelect(group.product.id)}>
       <div>
         <h3>{group.product.name}</h3>  {/* 製品名を主表示 */}
         <p>メーカー品番: {group.product.code}</p>
         {/* 得意先品番がある場合のみ表示 */}
         {group.items.length > 0 && group.items[0].customer_part_no && (
           <p className="text-xs">先方品番: {group.items[0].customer_part_no}</p>
         )}
       </div>
     </button>
   ))}
   ```

4. **製品選択ハンドラー変更:**
   ```typescript
   const handleProductSelect = (productId: number) => {
     // 直接Excelビューに遷移（warehouseId削除）
     navigate(`/inventory/excel-view/${productId}`);
   };
   ```

5. **倉庫選択ステップを削除:**
   - `step === "warehouse"`の条件分岐を削除
   - 関連する状態管理ロジックを削除

#### 3. ExcelViewPage更新（30分）

**ファイル:** `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`

**変更内容:**
1. **URLパラメータ変更:**
   ```typescript
   const { productId, customerItemId } = useParams<{
     productId: string;
     customerItemId?: string;
   }>();
   // warehouseIdパラメータを削除
   ```

2. **useExcelViewData呼び出し変更:**
   ```typescript
   const { data, isLoading, supplierId } = useExcelViewData(
     Number(productId),
     customerItemId ? Number(customerItemId) : undefined,
   );
   // warehouseIdパラメータを削除
   ```

**ファイル:** `frontend/src/features/inventory/components/excel-view/useExcelViewData.ts`

**変更内容:**
1. **関数シグネチャ変更:**
   ```typescript
   export function useExcelViewData(
     productId: number,
     customerItemId?: number,
   ): UseExcelViewDataReturn {
     // warehouseIdパラメータを削除
   ```

2. **ロットクエリ変更:**
   ```typescript
   const { data: lots = [], isLoading: lotsLoading } = useLotsQuery(
     isEnabled
       ? {
           supplier_item_id: productId,
           // warehouse_id: warehouseId, // 削除
           status: "active",
           with_stock: true,
         }
       : undefined,
   );
   ```

3. **TMPロットフィルタリング追加:**
   ```typescript
   const filteredLots = lots.filter(lot =>
     !lot.lot_number || !lot.lot_number.startsWith('TMP-')
   );
   ```

4. **倉庫情報を追加:**
   ```typescript
   const mapLotBlock = (lot: LotUI, context: MapContext): LotBlockData => {
     // ...
     return {
       // ...既存フィールド
       warehouseName: lot.warehouse_name || "不明",
       warehouseCode: lot.warehouse_code || "-",
     };
   };
   ```

**ファイル:** `frontend/src/features/inventory/components/excel-view/types.ts`

**変更内容:**
```typescript
export interface LotBlockData {
  // ...既存フィールド
  warehouseName?: string;
  warehouseCode?: string;
}
```

**ファイル:** `frontend/src/features/inventory/components/excel-view/LotSection.tsx`

**変更内容:**
```typescript
// LotInfoGroupsに倉庫情報を表示
<div className="...">
  <span className="font-bold">倉庫:</span>
  <span>{lot.warehouseName} ({lot.warehouseCode})</span>
</div>
```

#### 4. ルート定義更新

**ファイル:** `frontend/src/MainRoutes.tsx`

**変更内容:**
```typescript
<Route
  path="/inventory/excel-view/:productId/:customerItemId?"
  element={<ExcelViewPage />}
/>
// :warehouseId パラメータを削除
```

### 影響範囲の確認

**変更の影響を受ける可能性のあるファイル:**
- QuickLotIntakeDialogなど、ExcelViewPageへのリンクを生成するコンポーネント
- 在庫一覧から「Excelビューで開く」リンク

**確認と修正:**
- Grepで`/inventory/excel-view/`を検索し、すべての遷移先を更新

---

### フェーズ9: 追加機能（備考、コメント、出荷日）（優先度: 高）

#### 9.1 ロット備考欄の追加

**目標:** ロットごとに付加情報を記録可能にする

**タスク:**
- **バックエンド変更:**
  - `lot_receipts` テーブルに `remarks` 列を追加（Text, Nullable）
  - マイグレーション作成
  - APIスキーマとリポジトリを更新して備考の読み書きに対応

- **フロントエンド変更:**
  - `LotSection.tsx` の得意先情報の折りたたみの下に「備考」折りたたみを追加
  - 備考が存在する場合、ロットヘッダーにアイコンを表示
  - `handleLotFieldChange` で `remarks` のオートセーブに対応

**検証:**
- 備考に入力してフォーカスアウト → 保存されることを確認
- ロットヘッダーにアイコンが表示されることを確認

#### 9.2 数量別コメント機能

**目標:** 個別の引当数量（予測セル）に対してコメントを付与可能にする

**タスク:**
- **バックエンド変更:**
  - `allocation_suggestions` テーブルに `comment` 列を追加（Text, Nullable）
  - マイグレーション作成
  - APIスキーマを更新

- **フロントエンド変更:**
  - `DateGrid.tsx` の数量セルに右クリックメニュー「コメントを追加/編集」を追加
  - コメントがある場合、セルの右上に赤い▲マークを表示（Excel風）
  - ホバー時にコメント内容をツールチップ等で表示

**検証:**
- 右クリックからコメントを入力 → 赤い▲が表示されることを確認
- データが永続化されることを確認

#### 9.3 手動出荷日の表示

**目標:** LTからの自動計算以外に、手動で設定された出荷日を視覚化する

**タスク:**
- **バックエンド変更:**
  - `allocation_suggestions` テーブルに `manual_shipment_date` 列を追加（Date, Nullable）
  - マイグレーション作成

- **フロントエンド変更:**
  - `DateGrid.tsx` で、`manual_shipment_date` が設定されている場合、数量の下に薄い色で出荷日を表示
  - 右クリックメニューに「出荷日を設定」を追加

**検証:**
- 出荷日を設定 → 数量の下に日付が表示されることを確認

---

### フェーズ10: UIバグ修正とロット分割（優先度: 中）

#### 10.1 納入先数による罫線欠けの修正

**目標:** 納入先が少ない場合でもテーブルの右端の縦線が正しく表示されるようにする

**タスク:**
- `LotSection.tsx` および `ShipmentTable.tsx` のCSSクラス（border設定）を修正
- `flex-grow` や `w-full` の適用範囲を見直し、コンテンツが少ない場合でも外枠を維持

#### 10.2 ロット分割（分納対応）

**目標:** 1つの入荷（ロット）を分納などの理由で複数行に分割管理可能にする

**タスク:**
- **バックエンド変更:**
  - `POST /api/lots/{lot_id}/split` エンドポイント作成
  - 在庫数を分割後の新しい `lot_receipts` レコードに割り振るロジック
- **フロントエンド変更:**
  - 右クリックメニューに「ロットを分割」を追加
  - 分割数と各数量を入力するダイアログを実装

---

### フェーズ11: 在庫調整の厳格化（優先度: 高）

#### 11.1 理由必須の入庫数編集

**目標:** 不良品対応などの理由で入庫数を変更する際、必ず理由を記録する

**タスク:**
- **フロントエンド変更:**
  - 入庫数クリック時に直接編集ではなく、理由入力付きダイアログを表示
- **バックエンド変更:**
  - `Adjustment` モデルへの履歴保存を必須とする在庫更新サービスを実装
