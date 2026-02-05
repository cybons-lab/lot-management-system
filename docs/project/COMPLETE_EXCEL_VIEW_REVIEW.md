# Excel View 全フェーズ（Phase 1-11）総合レビュー依頼

**作成日**: 2026-02-05
**ブランチ**: `feature/excel-view-phase9-11`
**レビュー担当**: AI Assistant
**最終承認**: Human Developer

---

## 📋 レビュー概要

Excel View機能のPhase 1からPhase 11までのすべての実装について、総合的なレビューをお願いします。

**レビュー範囲**: Phase 1 ~ Phase 11（全11フェーズ）
**推定レビュー時間**: 2-3時間

---

## ✅ レビュー対応反映（2026-02-05）

以下の修正を実装済みです（テスト未実行）。

- Phase 9: `update_manual_suggestions()` に開始/完了/失敗ログと `rollback()` を追加（`backend/app/application/services/allocations/suggestion.py`）
- Phase 10.2: 消費済みロットの分割を禁止（`backend/app/application/services/inventory/lot_service.py`）
- Phase 10.3: `target_lot_index` の範囲/数量/重複/lot_id 検証を追加し、分割数量はDB上の割当数量から計算（`backend/app/application/services/inventory/lot_service.py`）
- Phase 10.3: 消費済みロットのスマート分割を禁止（`backend/app/application/services/inventory/lot_service.py`）
- Phase 10.3/11: ルーターで `HTTPException` を握りつぶさないよう修正（`backend/app/presentation/api/routes/inventory/lots_router.py`）
- Phase 11: `new_quantity < consumed_quantity` を禁止（`backend/app/application/services/inventory/lot_service.py`）
- Frontend: `split_count` を `splitTargets.length` で計算し、割当ゼロのスマート分割をブロック（`frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`）

### 🧪 テスト結果（未実行）
- バックエンドテスト: 未実行（依頼により後続で実施予定）
- フロントエンドテスト: 未実行（依頼により後続で実施予定）
- TypeScript型チェック: 未実行（依頼により後続で実施予定）
- ESLint: 未実行（依頼により後続で実施予定）

### 🔍 再レビュー項目（要確認）
- Phase 10.3: 割当数量の一致検証によるエラー時のUX確認（ユーザー向けメッセージ表示）
- Phase 10.2/10.3: 消費済みロット分割禁止の業務要件適合性
- Phase 11: `new_quantity < consumed_quantity` バリデーションの業務要件適合性
- Phase 9: 追加ログの出力内容/レベルが運用基準に合致するか
- Phase 10.3: `allocation_transfers` に同一キーが重複した場合のハンドリングの期待挙動

---

## 🎯 各フェーズの概要

### Phase 1-4: Excel View基盤構築

**ドキュメント**:
- `docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md`
- `docs/project/PHASE1_COMPLETION_SUMMARY.md`

**実装内容**:
1. **データ取得API**: `/api/v2/inventory/excel-view/{product_id}`
2. **基本UI構造**: ロットセクション、納入先テーブル、日付グリッド
3. **引当提案表示**: `allocation_suggestions`を基にした数量表示
4. **ロット情報表示**: ロット番号、受入日、使用期限、在庫数

**主要コンポーネント**:
```
frontend/src/features/inventory/components/excel-view/
├── ExcelViewPage.tsx          # メインページ
├── ProductHeader.tsx          # 品目ヘッダー
├── LotSection.tsx             # ロットセクション
└── subcomponents/
    ├── LotInfoGroups.tsx      # ロット情報グループ
    ├── BigStatColumn.tsx      # 大きな統計列
    ├── ShipmentTable.tsx      # 納入先テーブル
    └── DateGrid.tsx           # 日付グリッド
```

**バックエンドエンドポイント**:
```
GET /api/v2/inventory/excel-view/{product_id}
GET /api/v2/inventory/excel-view/{product_id}/customer-items/{customer_item_id}
```

---

### Phase 5-8: 数量編集・COA日付・納入先追加

**実装内容**:
1. **数量編集**: セル内で数量を直接編集
2. **COA日付設定**: 検査書発行日の入力
3. **新規納入先追加**: ダイアログから納入先を追加
4. **新規日付列追加**: カレンダーから日付列を追加

**主要機能**:
- `onQtyChange`: 数量変更ハンドラー
- `onCoaDateChange`: COA日付変更ハンドラー
- `onAddDestination`: 納入先追加ハンドラー
- `AddDestinationDialog`: 納入先追加ダイアログ

**バックエンドエンドポイント**:
```
POST /api/v2/allocation-suggestions/batch  # 数量バッチ更新
POST /api/delivery-places                  # 納入先作成
POST /api/delivery-settings                # 納入先別設定作成
```

---

### Phase 9: Excel View機能拡張（コメント・出荷日・メモ）

**ドキュメント**:
- `docs/project/PHASE9_IMPLEMENTATION_STATUS.md`
- `docs/project/HANDOFF_EXCEL_VIEW_PHASE9_REMAINING.md`

**実装内容**:
1. **Phase 9.1**: ロット備考（`lot_receipts.remarks`）
2. **Phase 9.2**: 数量別コメント（`allocation_suggestions.comment`）
   - セル右上に赤い三角形アイコン
   - ホバーでツールチップ表示
3. **Phase 9.3**: 手動出荷日（`allocation_suggestions.manual_shipment_date`）
   - セルにカレンダーアイコン
   - クリックで日付選択
4. **Phase 9.4**: ページレベルメモ（`customer_item_delivery_settings.notes`）
   - 右上に「ページメモ」ボタン
   - 展開/折りたたみ可能

**主要変更**:
```
backend/app/application/services/allocations/suggestion.py
  - update_manual_suggestions(): comment/manual_shipment_date永続化

frontend/src/features/inventory/components/excel-view/
  - ExcelViewPage.tsx: ページメモstate/handlers
  - LotSection.tsx: onCommentChange, onManualShipmentDateChange
  - DateGrid.tsx: コメント三角形、手動出荷日表示
```

---

### Phase 10: ロット分割機能

**ドキュメント**: `docs/project/HANDOFF_EXCEL_VIEW_PHASE9_REMAINING.md`

**実装内容**:
1. **Phase 10.2**: 基本的なロット分割API & ダイアログ
   - ロットを複数に分割
   - 各分割ロットの数量を手動入力
   - 合計が元の入庫数と一致することをバリデーション

2. **Phase 10.3**: スマート分割（割付転送機能付き）★重要
   - **3ステップウィザードUI**:
     - Step 1: 分割数を選択（2または3）
     - Step 2: 既存の納品予定を各ロットに振り分け
     - Step 3: プレビューと確認
   - **割り当て転送**:
     - 既存の`allocation_suggestions`を新ロットに転送
     - `comment`, `coa_issue_date`, `manual_shipment_date`も一緒に移動
   - **UX改善**: ユーザーフィードバックを反映した実務フロー対応

**主要実装**:
```
バックエンド:
backend/app/presentation/schemas/inventory/
  - lot_split_schema.py          # Phase 10.2
  - smart_split_schema.py        # Phase 10.3

backend/app/application/services/inventory/lot_service.py
  - split_lot_receipt()                       # Line 1225-1269
  - smart_split_lot_with_allocations()        # Line 1337-1450

backend/app/presentation/api/routes/inventory/lots_router.py
  - POST /api/lots/{lot_id}/split            # Phase 10.2
  - POST /api/lots/{lot_id}/smart-split      # Phase 10.3

フロントエンド:
frontend/src/features/inventory/components/
  - LotSplitDialog.tsx           # Phase 10.2
  - SmartLotSplitDialog.tsx      # Phase 10.3（3ステップウィザード）

frontend/src/features/inventory/api.ts
  - splitLotReceipt()
  - smartSplitLot()

frontend/src/features/inventory/components/excel-view/
  - ExcelViewPage.tsx: Smart split state/mutation/handler統合
  - LotSection.tsx: 分割ボタン追加
```

---

### Phase 11: 理由付き入庫数調整

**ドキュメント**: `docs/project/HANDOFF_EXCEL_VIEW_PHASE9_REMAINING.md`

**実装内容**:
- 入庫数変更時に理由を必須入力
- **理由テンプレート選択機能**:
  - 検品時に不良品を発見
  - 入力ミス
  - 棚卸差異
  - 破損・汚損
  - 期限切れ廃棄
  - 返品処理
  - その他（詳細を入力）
- **変更前後の数量表示**: 差分を色分け表示
- **監査証跡**: `adjustments`テーブルに記録

**主要実装**:
```
バックエンド:
backend/app/presentation/schemas/inventory/adjustment_reason_schema.py
  - LotReceiptQuantityUpdateRequest
  - LotReceiptQuantityUpdateResponse

backend/app/application/services/inventory/lot_service.py
  - update_lot_receipt_quantity_with_reason()  # Line 1271-1321

backend/app/presentation/api/routes/inventory/lots_router.py
  - PUT /api/lots/{lot_id}/quantity

フロントエンド:
frontend/src/features/inventory/components/LotQuantityUpdateDialog.tsx
  - 理由テンプレート選択
  - 「その他」時の詳細入力
  - 変更前後の数量表示

frontend/src/features/inventory/api.ts
  - updateLotQuantityWithReason()

frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx
  - Quantity update state/mutation/handler統合
```

---

## 🔍 レビュー観点

### 1. アーキテクチャ設計（Phase 1-4）

#### データフロー
- [ ] バックエンドAPIがRESTful原則に従っている
- [ ] データ取得が効率的（N+1クエリ問題なし）
- [ ] フロントエンドのステート管理が適切（TanStack Query）

#### コンポーネント設計
- [ ] コンポーネントの責務が明確
- [ ] 再利用可能なコンポーネント設計
- [ ] Props drillを適切に回避

#### パフォーマンス
- [ ] 初期ロード時間が許容範囲
- [ ] 不要な再レンダリングがない
- [ ] キャッシング戦略が適切

---

### 2. 機能実装（Phase 5-8）

#### 数量編集
- [ ] 数量変更が即座に反映される
- [ ] バリデーションが適切（負の数、小数点以下の桁数）
- [ ] エラー時のユーザーフィードバック

#### COA日付設定
- [ ] 日付選択UIが使いやすい
- [ ] 日付フォーマットが一貫している
- [ ] タイムゾーン処理が適切

#### 納入先・日付列追加
- [ ] ダイアログUIがユーザーフレンドリー
- [ ] マスタデータとの同期が適切
- [ ] エラーハンドリングが堅牢

---

### 3. 機能拡張（Phase 9）

#### ロット備考
- [ ] 備考が保存・表示される
- [ ] 最大文字数制限が適切
- [ ] UIが直感的

#### 数量別コメント
- [ ] コメント三角形が適切に表示される
- [ ] ツールチップが機能する
- [ ] コメントが永続化される
- [ ] フィルタリング・検索が可能か（オプション）

#### 手動出荷日
- [ ] カレンダーUIが使いやすい
- [ ] 出荷日が適切に表示される
- [ ] 永続化が正しく機能する

#### ページメモ
- [ ] 展開/折りたたみが機能する
- [ ] メモが保存される
- [ ] 複数ページで独立して管理される

---

### 4. ロット分割（Phase 10）

#### Phase 10.2: 基本分割
- [ ] 指定数量で分割できる
- [ ] 合計数量が一致する
- [ ] バリデーションが適切

#### Phase 10.3: スマート分割 ★重要レビューポイント
- [ ] **3ステップウィザードが直感的**
- [ ] **納品予定の振り分けが正確**
- [ ] **プレビュー画面が分かりやすい**
- [ ] **割り当て転送が正しく機能する**:
  - [ ] `allocation_suggestions.lot_id` が正しく更新される
  - [ ] `comment` が転送される
  - [ ] `coa_issue_date` が転送される
  - [ ] `manual_shipment_date` が転送される
- [ ] **未割り当て数量の警告が表示される**
- [ ] **トランザクションの一貫性**:
  - [ ] ロット作成と割り当て転送が同一トランザクション
  - [ ] エラー時にロールバックされる
- [ ] **パフォーマンス**:
  - [ ] 大量の納品予定でも動作する
  - [ ] N+1クエリ問題がない

---

### 5. 理由付き調整（Phase 11）

#### 理由テンプレート
- [ ] テンプレートが実務に即している
- [ ] 「その他」選択時に詳細入力欄が表示される
- [ ] バリデーションが適切

#### 監査証跡
- [ ] `adjustments`テーブルに記録される
- [ ] 必要な情報がすべて記録される:
  - [ ] `lot_id`
  - [ ] `adjustment_type = 'OTHER'`
  - [ ] `adjusted_quantity`（正または負）
  - [ ] `reason`
  - [ ] `adjusted_by`（ユーザーID）
  - [ ] `created_at`

#### UI/UX
- [ ] 変更前後の数量が分かりやすい
- [ ] 差分が色分け表示される（緑=増加、赤=減少）
- [ ] 理由入力が直感的

---

### 6. コード品質（全Phase）

#### CLAUDE.md準拠

**バックエンド**:
- [ ] ファイルサイズ: < 300行
- [ ] Cyclomatic complexity: < 10
- [ ] Type hints: すべての関数に型ヒント
- [ ] Docstrings: パブリックAPIにGoogle style
- [ ] Absolute imports: `from app.xxx`
- [ ] Transaction管理: `auto_commit`の適切な使用
- [ ] Decimal型: 数量と金額に`Decimal`使用
- [ ] API Router: 末尾スラッシュなし

**フロントエンド**:
- [ ] TypeScript: Strict mode、0エラー
- [ ] ESLint: 0 warnings
- [ ] ファイルサイズ: < 300行（論理的まとまりを優先）
- [ ] Sub-routing: タブ/セクションにサブルート
- [ ] Naming: PascalCase（コンポーネント）、kebab-case（その他）
- [ ] Hooks: `useCamelCase`
- [ ] `@/` alias使用

---

### 7. ロギング（Phase 10-11重点）

#### P0: Database operations
- [ ] Phase 9: comment/manual_shipment_date永続化のログ
- [ ] Phase 10.3: スマート分割開始/完了/エラーのログ
  - [ ] 分割開始: lot_id, split_count, allocation_count
  - [ ] 数量計算: split_quantities, total_allocated, remaining
  - [ ] 転送完了: transferred_count, new_lot_ids
  - [ ] エラー: lot_id, error詳細
- [ ] Phase 11: 入庫数調整開始/完了/エラーのログ
  - [ ] 調整開始: lot_id, old_quantity, new_quantity, reason
  - [ ] 調整完了: adjustment_id
  - [ ] エラー: lot_id, error詳細
- [ ] IntegrityError: エンティティID、エラー詳細
- [ ] SQLAlchemyError: 操作コンテキスト

#### ログフォーマット
- [ ] 構造化ログ（`extra`辞書）
- [ ] センシティブデータのマスキング
- [ ] エラーメッセージ: 最大500文字
- [ ] 適切なログレベル（DEBUG, INFO, ERROR）

---

### 8. エラーハンドリング（Phase 10-11重点）

#### Exception hierarchy
- [ ] Specific → general（IntegrityError → SQLAlchemyError → Exception）
- [ ] Phase 10.3: IntegrityError/SQLAlchemyErrorハンドリング
- [ ] Phase 11: IntegrityError/SQLAlchemyErrorハンドリング

#### Database error handling
- [ ] `db.rollback()` 実行
- [ ] エラーログ記録（エンティティID、操作タイプ、エラー詳細）
- [ ] HTTPException with user-friendly message
- [ ] `exc_info=True` でトレースバック

#### Input validation
- [ ] Phase 10.3: 数量超過チェック、空の分割チェック
- [ ] Phase 11: 理由空チェック、負の数量チェック
- [ ] Pydantic validation at API boundary

#### Safe error responses
- [ ] 例外詳細をクライアントに漏らさない
- [ ] HTTPException with 400/404/500 status
- [ ] ユーザーフレンドリーなエラーメッセージ

---

### 9. テストカバレッジ

#### バックエンドテスト
- [ ] Phase 10.3: スマート分割
  - [ ] 正常系: 2分割成功
  - [ ] 正常系: 3分割成功
  - [ ] 異常系: ロット不存在
  - [ ] 異常系: 数量超過
  - [ ] 異常系: 空の分割
- [ ] Phase 11: 理由付き調整
  - [ ] 正常系: 数量増加
  - [ ] 正常系: 数量減少
  - [ ] 異常系: ロット不存在
  - [ ] 異常系: 理由空
  - [ ] 異常系: 負の数量

#### テスト品質
- [ ] すべてのテストがパス（558+ passed）
- [ ] テストが独立している
- [ ] アサーションが適切
- [ ] エッジケースをカバー

---

### 10. セキュリティ

#### Route-level guards
- [ ] Admin専用機能: `get_current_admin`
- [ ] 一般機能: `get_current_user`
- [ ] Phase 10.3: ロット分割に認証必須
- [ ] Phase 11: 入庫数調整に認証必須

#### Input validation
- [ ] Pydantic schemaで入力バリデーション
- [ ] 数量: `Decimal`, `ge=0`
- [ ] 理由: `min_length=1`, `max_length=500`
- [ ] SQL injection対策（ORM使用）

#### Data access control
- [ ] ユーザーが権限のないロットにアクセス不可
- [ ] 監査証跡に`user_id`記録

---

### 11. パフォーマンス

#### Database operations
- [ ] N+1クエリ問題なし
- [ ] 適切なインデックス使用
- [ ] バッチ更新の活用
- [ ] `db.flush()` と `db.commit()` の適切な使い分け

#### Frontend
- [ ] TanStack Query（React Query）でキャッシング
- [ ] 楽観的更新
- [ ] キャッシュ無効化が適切
- [ ] 不要な再レンダリングなし

---

### 12. ドキュメント

#### コード内ドキュメント
- [ ] Docstrings（Google style）
- [ ] 複雑なロジックにコメント
- [ ] TODOコメントなし

#### プロジェクトドキュメント
- [ ] 各Phaseのドキュメント整備
- [ ] `CHANGELOG.md`: 変更履歴記録
- [ ] `README.md`: セットアップ手順

---

## 🧪 動作確認手順（全Phase）

### Phase 1-4: 基本表示

1. **Excel Viewページアクセス**
   ```
   1. メニューから「在庫管理」→「Excel View」を選択
   2. 任意の品目を選択
   3. ロットセクション、納入先テーブル、日付グリッドが表示されることを確認
   ```

2. **データ表示確認**
   ```
   1. ロット情報が正しく表示される
   2. 納入先ごとの数量が表示される
   3. 日付列の数量が表示される
   4. 合計が正しく計算される
   ```

### Phase 5-8: 編集機能

1. **数量編集**
   ```
   1. 任意のセルをクリック
   2. 数量を変更（例: 100 → 150）
   3. Enterまたはフォーカスアウトで保存
   4. トーストメッセージ「数量を保存しました」が表示
   5. ページをリロードして数量が保存されていることを確認
   ```

2. **COA日付設定**
   ```
   1. 任意のセルのカレンダーアイコンをクリック
   2. COA日付を選択
   3. セルに日付が表示される
   4. ページをリロードして保存されていることを確認
   ```

3. **納入先追加**
   ```
   1. 「納入先を追加」ボタンをクリック
   2. 軸コード、納入先名、納入先コードを入力
   3. 保存ボタンをクリック
   4. 新しい納入先行が追加されることを確認
   ```

### Phase 9: 機能拡張

1. **ロット備考**
   ```
   1. ロット情報セクションの備考フィールドに「テスト備考」と入力
   2. 保存されることを確認
   3. ページをリロードして表示されることを確認
   ```

2. **数量別コメント**
   ```
   1. 任意のセルにコメントを入力
   2. セル右上に赤い三角形が表示される
   3. 三角形にホバーでコメントがツールチップ表示される
   4. ページをリロードして保存されていることを確認
   ```

3. **手動出荷日**
   ```
   1. 任意のセルのカレンダーアイコンをクリック
   2. 手動出荷日を選択
   3. セルに出荷日が表示される
   4. ページをリロードして保存されていることを確認
   ```

4. **ページメモ**
   ```
   1. 右上の「ページメモ」ボタンをクリック
   2. メモを入力して保存
   3. ボタンが青色に変わることを確認
   4. ページをリロードしてメモが表示されることを確認
   ```

### Phase 10: ロット分割

1. **基本分割（Phase 10.2）**
   ```
   1. ロットの右クリックメニューから「ロットを分割」を選択
   2. 分割数量を入力（例: 200, 248）
   3. 合計が現在数量と一致することを確認
   4. 実行ボタンをクリック
   5. ロットが2つに分割されることを確認
   ```

2. **スマート分割（Phase 10.3）- 2分割** ★重要
   ```
   1. ロットの右上にある分割ボタン（Split icon）をクリック
   2. 「2分割」を選択
   3. Step 2: 既存の納品予定を「ロット1（元）」と「ロット2（新規1）」に振り分け
   4. Step 3: プレビューで各ロットの数量を確認
   5. 実行ボタンをクリック
   6. ロットが2つに分割されることを確認
   7. 各ロットに正しい納品予定が紐づいていることを確認
   8. コメント、COA日付、手動出荷日も転送されていることを確認
   ```

3. **スマート分割（Phase 10.3）- 3分割** ★重要
   ```
   1. ロットの分割ボタンをクリック
   2. 「3分割」を選択
   3. 納品予定を3つのロットに振り分け
   4. プレビューで各ロットの数量を確認
   5. 実行して3つのロットが作成されることを確認
   ```

4. **割り当て転送確認**
   ```
   1. コメント、COA日付、手動出荷日が設定された納品予定を含むロットを分割
   2. 分割後、新ロットに納品予定と一緒にこれらの情報が転送されることを確認
   3. データベースで`allocation_suggestions`の`lot_id`が更新されていることを確認
   ```

### Phase 11: 理由付き調整

1. **数量増加**
   ```
   1. ロット上で右クリック → 「入庫数を調整」
   2. 理由テンプレートから「入力ミス」を選択
   3. 数量を増やす（例: 448 → 500）
   4. 差分が緑色の「+52」で表示されることを確認
   5. 更新ボタンをクリック
   6. 入庫数が更新されることを確認
   ```

2. **数量減少**
   ```
   1. 「入庫数を調整」を開く
   2. 理由テンプレートから「検品時に不良品を発見」を選択
   3. 数量を減らす（例: 500 → 448）
   4. 差分が赤色の「-52」で表示されることを確認
   5. 更新して入庫数が減少することを確認
   ```

3. **「その他」理由入力**
   ```
   1. 理由テンプレートから「その他（詳細を入力）」を選択
   2. 詳細入力欄が表示されることを確認
   3. カスタム理由を入力（例: 「サンプル品として使用」）
   4. 更新して保存されることを確認
   ```

4. **監査証跡確認**
   ```sql
   SELECT * FROM adjustments
   WHERE lot_id = (調整したロットID)
   ORDER BY created_at DESC;

   -- 以下が記録されていることを確認:
   -- - adjustment_type = 'OTHER'
   -- - adjusted_quantity（正または負）
   -- - reason（選択した理由）
   -- - adjusted_by（ユーザーID）
   -- - created_at
   ```

---

## 🔍 データベース確認クエリ

### Phase 9: データ永続化確認

```sql
-- ロット備考
SELECT id, lot_number, remarks
FROM lot_receipts
WHERE remarks IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 数量別コメント
SELECT id, lot_id, delivery_place_id, forecast_period, comment
FROM allocation_suggestions
WHERE comment IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 手動出荷日
SELECT id, lot_id, delivery_place_id, forecast_period, manual_shipment_date
FROM allocation_suggestions
WHERE manual_shipment_date IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- ページメモ
SELECT id, customer_item_id, notes
FROM customer_item_delivery_settings
WHERE notes IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### Phase 10: スマート分割確認

```sql
-- 分割されたロット一覧（同じlot_master_idを持つロット）
SELECT
    lr.id,
    lr.lot_number,
    lr.lot_master_id,
    lr.received_quantity,
    lr.created_at
FROM lot_receipts lr
WHERE lr.lot_master_id IN (
    SELECT lot_master_id FROM lot_receipts GROUP BY lot_master_id HAVING COUNT(*) > 1
)
ORDER BY lr.lot_master_id, lr.created_at;

-- 割り当て転送確認（分割後の新ロットに紐づく納品予定）
SELECT
    as2.id,
    as2.lot_id,
    as2.delivery_place_id,
    as2.forecast_period,
    as2.quantity,
    as2.comment,
    as2.coa_issue_date,
    as2.manual_shipment_date
FROM allocation_suggestions as2
WHERE as2.lot_id IN (新しいロットID)
ORDER BY as2.lot_id;
```

### Phase 11: 監査証跡確認

```sql
-- 入庫数調整履歴
SELECT
    a.id,
    a.lot_id,
    lr.lot_number,
    a.adjustment_type,
    a.adjusted_quantity,
    a.reason,
    a.adjusted_by,
    u.username,
    a.created_at
FROM adjustments a
JOIN lot_receipts lr ON a.lot_id = lr.id
JOIN users u ON a.adjusted_by = u.id
WHERE a.adjustment_type = 'OTHER'
ORDER BY a.created_at DESC
LIMIT 20;
```

---

## 📊 品質メトリクス

### テスト結果

**期待される結果**:
```bash
# バックエンドテスト
docker compose exec backend pytest -v
# 期待: 558+ passed, 1 xfailed

# フロントエンドテスト（存在する場合）
docker compose exec frontend npm test
# 期待: All tests pass

# 型チェック
docker compose exec frontend npm run typecheck
# 期待: 0 errors

# Lint
docker compose exec backend ruff check app/
docker compose exec frontend npm run lint
# 期待: 0 errors
```

---

## ⚠️ 既知の制限事項

### Phase 9: UI微調整（スキップ済み）

1. **罫線バグ**（P1 - スキップ）
   - 納入先5件以下で右端の縦線が最下部まで揃わない
   - ユーザー指示によりスキップ

2. **コメント三角形の角度**（P2 - スキップ）
   - 現在: 右上に表示
   - 要求: 左上に45度回転
   - ユーザー指示によりスキップ

### Phase 10.3: スマート分割

1. **分割数の制限**
   - 現在: 2分割または3分割のみ
   - 拡張可能: 4分割以上も実装可能だが、UX上の理由で制限

2. **未割り当て数量の処理**
   - すべての納品予定を振り分けない場合、残りは「ロット1（元）」に残る
   - プレビュー画面で警告表示

### Phase 11: 理由付き調整

1. **数量減少の制約**
   - 消費済み数量（`consumed_quantity`）以下には減らせない
   - バリデーションで制約（要確認）

---

## 🚨 レビュー時の注意点

### 1. トランザクション処理

**確認ポイント**:
- Phase 10.3: 複数ロット作成 + 割り当て転送が同一トランザクション内
- Phase 11: 入庫数更新 + 調整レコード作成が同一トランザクション内
- エラー時に`db.rollback()`が実行される

### 2. データ整合性

**確認ポイント**:
- Phase 10.3: 分割前後で数量の合計が一致
- Phase 10.3: 割り当てが重複しない（同じallocation_suggestionが複数ロットに紐づかない）
- Phase 11: `adjustments.adjusted_quantity` = 新数量 - 旧数量

### 3. パフォーマンス

**確認ポイント**:
- Phase 10.3: 割り当て転送でN+1クエリ問題が発生していないか
- フロントエンド: キャッシュ無効化が過剰でないか

### 4. セキュリティ

**確認ポイント**:
- すべてのAPIエンドポイントに認証依存性注入
- ユーザーが他人のロットを操作できないか
- SQL injectionの可能性（ORM使用で基本的に安全）

---

## 📝 レビュー結果報告フォーマット

レビュー完了後、以下の形式で報告してください：

```markdown
# Excel View Phase 1-11 総合レビュー結果

## ✅ 合格項目（Phase別）

### Phase 1-4: 基盤構築
- [項目1]: 理由
- [項目2]: 理由

### Phase 5-8: 編集機能
- [項目1]: 理由
- [項目2]: 理由

### Phase 9: 機能拡張
- [項目1]: 理由
- [項目2]: 理由

### Phase 10: ロット分割
- [項目1]: 理由
- [項目2]: 理由

### Phase 11: 理由付き調整
- [項目1]: 理由
- [項目2]: 理由

## ⚠️ 改善推奨項目（Phase別）

### Phase X
- [項目1]: 問題点と改善案
- [項目2]: 問題点と改善案

## 🚨 要修正項目（クリティカル）

### Phase X
- [項目1]: 問題点と修正方法
- [項目2]: 問題点と修正方法

## 📊 品質メトリクス
- バックエンドテスト: XXX passed, X xfailed
- フロントエンドテスト: All pass / X failed
- TypeScriptエラー: 0 / X errors
- ESLintエラー: 0 / X errors

## 🎯 各Phaseの完成度評価

| Phase | 機能 | 完成度 | 品質 | 備考 |
|-------|------|--------|------|------|
| 1-4 | 基盤構築 | X% | A/B/C | 備考 |
| 5-8 | 編集機能 | X% | A/B/C | 備考 |
| 9 | 機能拡張 | X% | A/B/C | 備考 |
| 10 | ロット分割 | X% | A/B/C | 備考 |
| 11 | 理由付き調整 | X% | A/B/C | 備考 |

## 💬 総評
[全体的な評価と所感]

## 🏆 特に優れている点
1. [優れている点1]
2. [優れている点2]

## 📌 次のアクション
1. [アクション1]
2. [アクション2]
```

---

## 📚 参考ドキュメント

### プロジェクト全体
- **CLAUDE.md**: プロジェクト全体のガイドライン
- **CHANGELOG.md**: 変更履歴
- **README.md**: セットアップ手順

### Phase別ドキュメント
- **Phase 1-4**:
  - `docs/project/PHASE1-4_IMPLEMENTATION_PLAN.md`
  - `docs/project/PHASE1_COMPLETION_SUMMARY.md`
- **Phase 9**:
  - `docs/project/PHASE9_IMPLEMENTATION_STATUS.md`
- **Phase 9-11**:
  - `docs/project/HANDOFF_EXCEL_VIEW_PHASE9_REMAINING.md`
- **Phase 10-11 (ロギング・テスト)**:
  - `docs/project/HANDOFF_PHASE10_11_LOGGING_TESTS.md`

### 標準・ガイドライン
- `docs/standards/error-handling.md`: エラーハンドリング標準
- `docs/standards/security.md`: セキュリティ標準
- `docs/standards/state-management.md`: ステート管理パターン

---

## 🎯 レビュー完了の定義

以下すべてが満たされた場合、レビュー完了とします：

### 機能面
- [ ] すべてのPhaseの機能が仕様通り動作する
- [ ] エッジケースが適切にハンドリングされている
- [ ] データ整合性が保たれている

### 品質面
- [ ] CLAUDE.mdのガイドラインに準拠している
- [ ] ロギングが適切に実装されている（Phase 10-11）
- [ ] エラーハンドリングが堅牢（Phase 10-11）

### テスト面
- [ ] すべてのテストがパス（558+ passed）
- [ ] 新機能のテストカバレッジが十分（Phase 10-11）

### セキュリティ面
- [ ] 認証・認可が適切に実装されている
- [ ] 入力バリデーションが適切
- [ ] データアクセス制御が適切

### パフォーマンス面
- [ ] 明らかなパフォーマンス問題がない
- [ ] N+1クエリ問題がない
- [ ] キャッシング戦略が適切

### ドキュメント面
- [ ] コード内ドキュメントが適切
- [ ] プロジェクトドキュメントが更新されている

---

## 📋 推定レビュー時間

- **Phase 1-4（基盤構築）**: 30分
- **Phase 5-8（編集機能）**: 30分
- **Phase 9（機能拡張）**: 30分
- **Phase 10（ロット分割）**: 45分 ★重点
- **Phase 11（理由付き調整）**: 30分
- **品質・セキュリティ・パフォーマンス**: 30分
- **動作確認**: 60分
- **レポート作成**: 30分

**合計**: 約4-5時間

---

**レビュー完了後、Human Developerに最終承認を依頼してください。Good luck! 🚀**
