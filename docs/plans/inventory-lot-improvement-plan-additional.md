# 在庫・ロット管理改善 追加タスク計画

**作成日**: 2026-01-16  
**基準ドキュメント**: `docs/reviews/inventory-lot-management-review_merged.md`  
**対象**: 既存計画（`docs/plans/inventory-lot-improvement-plan.md`）に未反映だった項目

---

## 目的

レビューで指摘されたが既存計画に含まれていない課題を、追加タスクとして整理する。  
Jotaiの状態管理改善もこの計画に含める。

---

## Decision Record（確定済み）

レビューで合意した決定事項を固定し、実装のブレを防止する。

1. **展開行の仕様**
   - 既定は **単一展開（アコーディオン）**。
   - 将来の拡張余地として `DataTable` に `expandMode: "single" | "multi"` を用意する。
   - Itemsビューは `"single"` 固定、他ビューで必要になったら `"multi"` を検討。
2. **ロットステータス表現の範囲**
   - Phase Aでの最小セット（誤出庫防止に直結）:
     1. 期限切れ（Expired）
     2. NG / 廃棄（Rejected / Disposed）
     3. 検査待ち / 保留（QC Hold）
     4. 枯渇（Empty）
     5. 利用可（Available）
   - ロック量 / 予約（未確定）/ 確定引当は **ステータスではなく数量表示** として扱う。
   - 追加の細分類は Phase A3 で段階導入。
3. **在庫サマリとロット詳細のSSOT**
   - SSOTは **バックエンドのビュー（またはDB関数）** に統一し、UIは再計算しない。
   - ルール固定:
     - `available = on_hand - locked - confirmed`
     - `reserved(active)` は減算しない（別列で可視化）
     - `locked / confirmed / reserved(active)` は同一計算ソースから返す
4. **StockHistory と StockMovement の統合方針**
   - **StockMovement を正（台帳/イベントログ）** とする。
   - StockHistory は読み取り用（View/ReadModel）に寄せる。
   - 将来的に命名統一するなら `InventoryLedgerEntry` への一本化を検討。
5. **ビューのパフォーマンス対策**
   - 優先順位は **現状維持 + 計測 + インデックス/クエリ改善**。
   - それでも不足ならマテビュー、キャッシュ層は最後。
6. **withdrawal_lines 集計の方針**
   - `consumed_quantity` カラムを導入し、トランザクション内で更新する方式を採用。
   - 併せて整合性チェック用の再計算（夜間/手動）を用意。
7. **状態管理ガイドラインの文書化範囲**
   - 適用は **Inventoryに限定**。ただし文書は他機能へ転用可能な書き方にする。

---

## 実行順（推奨）

### Phase 0: Decision Record 反映
- 本Decision Recordを計画冒頭に固定し、全タスクの前提条件とする。

### Phase 1: 数値の整合性（最優先）
1. **B3** 在庫サマリとロット詳細のSSOT統一
2. **B2** v1/v2 型定義の統一
3. **A2** ロット行に予約/確定/ロック + 式の明記

### Phase 2: UI操作の迷いを潰す
1. **A1** 単一展開の実装（expandMode対応）
2. **A4** フィルター導線の見直し

### Phase 3: 設計整理とJotai改善
1. **B1** StockMovement 正の統一
2. **A3** ロットステータス拡張
3. **D1-D3** Jotai整理（状態集約/派生atom/副作用解消）
4. **D4** 状態管理ガイドライン

### Phase 4: 性能対策
1. **C1** 計測と方式決定（現状維持 + 改善優先）
2. **C2** `consumed_quantity` 導入

---

## 進捗ステータス（作業ログ用）

> **運用**: ここは進捗が出るたびに更新する。完了したタスクは「✅」を付けて明示する。

- ✅ **D4** 状態管理ガイドラインの文書化（Inventory適用）
- ✅ **B3** 在庫サマリとロット詳細のSSOT統一
- ✅ **B2** v1/v2 型定義の統一
- ✅ **A2** ロット行に予約/確定/ロック + 式の明記
- ✅ **A1** 単一展開の実装（expandMode対応）
- ⬜ **A4** フィルター導線の見直し
- ⬜ **B1** StockMovement 正の統一
- ⬜ **A3** ロットステータス拡張
- ✅ **D1** Inventory状態のJotai整理
- ✅ **D2** 派生atomによるqueryParams管理
- ✅ **D3** レンダリング中の状態更新を解消
- ⬜ **C1** 計測と方式決定（現状維持 + 改善優先）
- ⬜ **C2** `consumed_quantity` 導入

## Phase A: UI/UX 改善（追加分）

### Task A1: 展開行の単一展開実装（拡張余地つき）

**依存関係**: なし

**作業内容**:
1. `DataTable` に `expandMode: "single" | "multi"` を追加
2. Itemsビューは `"single"` 固定でアコーディオン動作にする
3. `onExpandedRowsChange` の差分検知を単一展開仕様に合わせて修正
4. UI上の表記（「1件ずつ展開」など）を追加

**対象ファイル**:
- `frontend/src/shared/components/data/DataTable.tsx`
- `frontend/src/features/inventory/components/InventoryTable*`

**受け入れ条件**:
- [ ] 仕様に一致した挙動が担保されている
- [ ] UIでユーザーの期待値がズレない

---

### Task A2: ロット行の詳細情報（判断材料）追加

**依存関係**: Task A1 と並行可能

**作業内容**:
1. ロット行に「予約（未確定）」「確定引当」「ロック」を表示
2. 「利用可能 = 残量 − ロック − 確定引当」をツールチップ等で明記
3. 列 or ツールチップのUI設計

**対象ファイル**:
- `frontend/src/features/inventory/components/InventoryTableExpandedRow.tsx`
- `frontend/src/features/inventory/components/LotTable.tsx`

**受け入れ条件**:
- [ ] 利用可能の式がUI表示と一致
- [ ] 予約/確定/ロックが確認できる

---

### Task A3: ロットステータス表現の拡張（段階導入）

**依存関係**: Task A2 と並行可能

**作業内容**:
1. Phase Aの最小セット（期限切れ/NG/検査待ち/枯渇/利用可）を実装
2. 追加の細分類は段階導入として整理
3. アイコン/色/フィルタで明確に区別し、FEFO運用を支援する強調表示を追加

**対象ファイル**:
- `frontend/src/features/inventory/components/LotTable.tsx`
- `frontend/src/features/inventory/components/InventoryTableExpandedRow.tsx`

**受け入れ条件**:
- [ ] 期限切れが視覚的に判別できる
- [ ] 誤出庫抑止の表示が追加される

---

### Task A4: フィルターのビュー非依存化

**依存関係**: なし

**作業内容**:
1. Items以外のビューでも利用できるフィルタ導線を設計
2. 仕入先別/倉庫別/製品別の適切なフィルタ組み合わせを決定
3. `InventoryPage` のフィルタUI構成を変更

**対象ファイル**:
- `frontend/src/features/inventory/pages/InventoryPage.tsx`
- `frontend/src/features/inventory/components/*`

**受け入れ条件**:
- [ ] どのビューでもフィルタ可能
- [ ] フィルタ適用が集計ビューに反映される

---

### Task A5: ロット登録フォームの入力負荷低減

**依存関係**: なし

**作業内容**:
1. 入力項目のグルーピング（基本情報/数量/日付など）
2. 任意項目の折りたたみ（アコーディオン）
3. ステップフォーム化の必要性を検討

**対象ファイル**:
- `frontend/src/features/inventory/components/AdhocLotCreateForm.tsx`

**受け入れ条件**:
- [ ] 必須/任意が視覚的に分かる
- [ ] 入力負荷が軽減される

---

## Phase B: 設計・データ整合性

### Task B1: StockHistory / StockMovement の統一

**依存関係**: なし

**作業内容**:
1. 役割差分の調査
2. 正式モデルを決定
3. 片方を削除またはラップし、命名を統一

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/inventory_models.py`
- `backend/app/application/services/inventory/lot_service.py`

**受け入れ条件**:
- [ ] 監査ログのSSOTが統一されている

---

### Task B2: v1/v2 型定義の統一

**依存関係**: なし

**作業内容**:
1. 既存のAPI利用箇所を洗い出し
2. v2型定義に統一 or 変換層を導入

**対象ファイル**:
- `frontend/src/features/inventory/api.ts`
- `frontend/src/shared/types/*`

**受け入れ条件**:
- [ ] v1/v2の混在が解消

---

### Task B3: 在庫サマリとロット詳細のSSOT統一

**依存関係**: Task B2 と並行可能

**作業内容**:
1. 同じ数字として扱う指標の洗い出し
2. SSOTとなるビュー/サービスの決定
3. UI側の表示注釈を必要に応じて追加

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/views_models.py`
- `frontend/src/features/inventory/components/*`

**受け入れ条件**:
- [ ] 集計と明細が一致

---

## Phase C: スケーラビリティ・パフォーマンス

### Task C1: ビュー更新方式の計測と改善方針策定

**依存関係**: Task B3

**作業内容**:
1. データ量の現状把握とEXPLAIN計測
2. インデックス/クエリ改善の優先適用
3. それでも不足時にマテビュー検討（キャッシュ層は最後）

**対象ファイル**:
- `docs/design/inventory_view_strategy.md` (新規)

**受け入れ条件**:
- [ ] 更新方式が明文化されている

---

### Task C2: `consumed_quantity` 導入（再計算ルート付き）

**依存関係**: Task C1 と並行可能

**作業内容**:
1. `consumed_quantity` カラムを追加
2. 出庫登録/取消/修正パスでトランザクション内更新
3. 整合性チェック用の再計算（夜間/手動）を用意

**対象ファイル**:
- `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- `backend/alembic/versions/`

**受け入れ条件**:
- [ ] 残量計算がスケールしても許容範囲の性能

---

## Phase D: 状態管理（Jotai改善）

### Task D1: Inventory状態のJotai整理

**依存関係**: なし

**作業内容**:
1. `LotSearchPanel` の `lotSearchStateAtom` を `state.ts` に移動
2. `sessionStorage` / `localStorage` の方針を統一
3. Inventory全体の状態一覧をコメントで整理

**対象ファイル**:
- `frontend/src/features/inventory/state.ts`
- `frontend/src/features/inventory/components/LotSearchPanel.tsx`

**受け入れ条件**:
- [ ] 状態定義が一箇所に集約されている

---

### Task D2: 派生atomによるqueryParams管理

**依存関係**: Task D1

**作業内容**:
1. `useInventoryPageState` の `queryParams` 計算を派生atom化
2. 参照先を `useAtomValue` 等で統一

**対象ファイル**:
- `frontend/src/features/inventory/state.ts`
- `frontend/src/features/inventory/hooks/useInventoryPageState.ts`

**受け入れ条件**:
- [ ] Jotaiの派生atomで依存関係が明確

---

### Task D3: レンダリング中の状態更新を解消

**依存関係**: Task D1

**作業内容**:
1. `LotSearchPanel` の state 更新を `useEffect` に移行
2. Jotai + React の副作用ルールに準拠

**対象ファイル**:
- `frontend/src/features/inventory/components/LotSearchPanel.tsx`

**受け入れ条件**:
- [ ] レンダリング中の副作用が排除されている

---

### Task D4: 状態管理ガイドラインの文書化（Inventory適用）

**依存関係**: Task D1-D3

**作業内容**:
1. ページレベル vs コンポーネントレベルの責務を明文化
2. 永続化対象と非対象のルールを整理
3. Inventoryに適用し、他機能へ転用可能な書き方にする

**対象ファイル**:
- `docs/standards/state-management.md` (新規)

**受け入れ条件**:
- [ ] Inventory以外にも適用可能な指針になっている

---

## 優先度（案）

| タスク | 優先度 | 理由 |
|-------|--------|------|
| A1 | 高 | 単一展開仕様の固定 |
| A2 | 高 | 判断材料不足は誤操作に直結 |
| A3 | 中 | 段階導入で状態視認性を改善 |
| A4 | 中 | ビューごとのUX改善 |
| A5 | 中 | 入力負荷の軽減 |
| B1 | 中 | 設計の混乱回避 |
| B2 | 中 | 型安全性の担保 |
| B3 | 高 | 数値整合性の担保 |
| C1 | 中 | 計測ベースで改善方針を固定 |
| C2 | 中 | 大量データ時の計算負荷対策 |
| D1 | 高 | 状態の可視化・統一 |
| D2 | 中 | 派生状態の再利用性向上 |
| D3 | 中 | React/Jotaiの健全性確保 |
| D4 | 中 | Inventory起点の運用ルール |
