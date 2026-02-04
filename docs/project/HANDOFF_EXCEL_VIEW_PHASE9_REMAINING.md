# Excel View Phase 9-11 残タスク完了のための引き継ぎプロンプト

**作成日**: 2026-02-05
**ブランチ**: `feature/excel-view-phase9-11`
**最終コミット**: `a91d421b` (納入先5件以下の罫線バグ修正を試行)

---

## 📋 現在の状況サマリ

### ✅ 完了済みタスク (Phase 9)

1. **Phase 9.1**: ロット備考（`lot_receipts.remarks`）実装完了
2. **Phase 9.2**: 数量別コメント（`allocation_suggestions.comment`）UI実装完了
3. **Phase 9.3**: 手動出荷日（`allocation_suggestions.manual_shipment_date`）UI実装完了
4. **ページレベルメモ**: `customer_item_delivery_settings.notes` 実装完了

### ⚠️ 残課題（優先度順）

#### 🔴 P0: Phase 9の永続化バグ修正（最優先）

**問題**: Phase 9.2（コメント）と9.3（手動出荷日）の保存時に200 OKが返るが画面に反映されない。

**原因**: バックエンドの `v2/forecast/suggestions/batch` エンドポイントで `comment` と `manual_shipment_date` フィールドの永続化処理が未実装の可能性。

**確認方法**:
```sql
-- データベースで直接確認
SELECT id, lot_id, delivery_place_id, forecast_period, quantity, comment, manual_shipment_date
FROM allocation_suggestions
WHERE comment IS NOT NULL OR manual_shipment_date IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

**修正対象ファイル**:
- `backend/app/presentation/api/routes/v2/forecast/router.py` (batch updateエンドポイント)
- `backend/app/application/services/allocations/suggestion.py`
- `backend/app/infrastructure/repositories/allocation_suggestion_repository.py`

**フロントエンド側の実装**（既に正しい）:
- `frontend/src/features/allocations/api.ts:126-153` (batchUpdateAllocationSuggestions)
- キャッシュ無効化: `refetchType: "all"` で実装済み

**期待される修正内容**:
```python
# backend/app/application/services/allocations/suggestion.py
def batch_update_suggestions(self, updates: list[dict]):
    for update in updates:
        suggestion = self.repository.get_by_id(update['id'])
        if 'quantity' in update:
            suggestion.quantity = update['quantity']
        if 'comment' in update:  # ← 追加必要
            suggestion.comment = update['comment']
        if 'manual_shipment_date' in update:  # ← 追加必要
            suggestion.manual_shipment_date = update['manual_shipment_date']
        self.repository.update(suggestion)
    self.session.commit()
```

---

#### 🟡 P1: 納入先5件以下の罫線バグ修正

**問題**: 納入先が5件未満の場合、ShipmentTableとDateGridの右端の縦線が揃わない。

**現状**: `min-h-[272px]` を追加したが効果なし。

**根本原因**: FlexboxベースでコンポーネントごとにHeader/Rows/Footerが独立しているため、行の高さが完全に揃わない。

**推奨アプローチ**: CSS Gridへの変更（テーブルは不可 - パフォーマンス問題）

**修正案（CSS Grid使用）**:
```tsx
// LotSection.tsx Line 177
<div className="grid grid-cols-[auto_80px_280px_80px_1fr] min-h-[272px]">
  <LotInfoGroups />
  <BigStatColumn label="入庫数" />
  <ShipmentTable />
  <BigStatColumn label="現在の在庫" />
  <DateGrid />
</div>
```

**関連ファイル**:
- `frontend/src/features/inventory/components/excel-view/LotSection.tsx:177`
- `frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx:45`
- `frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx:292`

**検証方法**: 納入先が1-2件のロットで右端の縦線が最下部まで揃うことを確認。

---

#### 🟢 P2: その他の残タスク

1. **Phase 10.2**: ロット分割（分納）API & ダイアログ実装
2. **Phase 11**: 理由付き在庫調整（入庫数編集時の理由入力ダイアログ）

---

## 🚀 次のチャットで実行すべきタスク（優先度順）

### タスク1: Phase 9 永続化バグ修正（15-30分）

1. バックエンドの永続化処理を調査
   ```bash
   # ファイルを確認
   cat backend/app/presentation/api/routes/v2/forecast/router.py | grep -A 20 "batch"
   cat backend/app/application/services/allocations/suggestion.py | grep -A 30 "batch_update"
   ```

2. `comment` と `manual_shipment_date` の永続化処理を追加

3. データベースで動作確認
   ```sql
   -- テストデータで確認
   SELECT * FROM allocation_suggestions WHERE id = 1;
   ```

4. フロントエンドで保存→再取得を確認

---

### タスク2: 罫線バグ修正（30-60分）

1. CSS Gridへの変更を実装
   - `LotSection.tsx` のメインコンテナを `grid` に変更
   - 各コンポーネントの幅を `grid-cols` で調整

2. 各コンポーネントの内部構造を調整
   - Header/Rows/Footerの高さを統一
   - `h-8`, `h-10`, `h-10` を維持

3. ブラウザで視覚確認（納入先1件、3件、5件、10件で検証）

---

### タスク3: テスト実行（10分）

```bash
# 品質チェック
make quality-check

# 型定義更新（バックエンド変更がある場合）
make frontend-typegen
```

---

## 📂 重要ファイル一覧

### バックエンド（Phase 9 永続化）
```
backend/app/presentation/api/routes/v2/forecast/router.py
backend/app/application/services/allocations/suggestion.py
backend/app/infrastructure/repositories/allocation_suggestion_repository.py
backend/app/presentation/schemas/allocations/allocation_suggestions_schema.py
```

### フロントエンド（罫線バグ修正）
```
frontend/src/features/inventory/components/excel-view/LotSection.tsx
frontend/src/features/inventory/components/excel-view/subcomponents/ShipmentTable.tsx
frontend/src/features/inventory/components/excel-view/subcomponents/DateGrid.tsx
frontend/src/features/inventory/components/excel-view/subcomponents/BigStatColumn.tsx
```

### ドキュメント
```
docs/project/EXCEL_VIEW_NEXT_STEPS.md (進捗記録)
docs/project/EXCEL_VIEW_IMPROVEMENT_PLAN.md (詳細計画)
docs/project/PHASE9_IMPLEMENTATION_STATUS.md (Phase 9実装状況)
```

---

## 🛠️ 開発環境セットアップ

```bash
# サービス起動確認
make up

# ブランチ確認
git status
# Expected: On branch feature/excel-view-phase9-11

# 最新コミット確認
git log --oneline -5
```

---

## ✅ 完了チェックリスト

### Phase 9 永続化修正
- [ ] バックエンドで `comment` と `manual_shipment_date` の永続化処理を追加
- [ ] データベースで保存を確認
- [ ] フロントエンドで保存→画面反映を確認
- [ ] `make backend-test` でテスト通過
- [ ] コミット: `fix(allocations): Phase 9 comment/shipment date永続化処理を追加`

### 罫線バグ修正
- [ ] CSS Gridへの変更実装
- [ ] 納入先1件、3件、5件、10件で罫線の揃いを確認
- [ ] `make frontend-typecheck` と `make frontend-lint` 通過
- [ ] コミット: `fix(excel-view): CSS Gridで罫線バグを修正`

### 最終確認
- [ ] `make quality-check` 通過
- [ ] `docs/project/EXCEL_VIEW_NEXT_STEPS.md` を更新（完了済みタスクにチェック）
- [ ] コミット: `docs: Phase 9-10 完了状況を記録`

---

## 🔍 トラブルシューティング

### Phase 9: データが保存されない場合

1. **ネットワークタブで確認**
   - リクエストボディに `comment` と `manual_shipment_date` が含まれているか確認
   - レスポンスが200 OKか確認

2. **バックエンドログで確認**
   ```bash
   docker compose logs backend -f | grep -i "batch"
   ```

3. **データベースで直接確認**
   ```bash
   make db-shell
   # psql> SELECT * FROM allocation_suggestions WHERE id = 1;
   ```

### 罫線バグ: CSS Gridでも揃わない場合

1. **ブラウザ開発者ツールで確認**
   - 各コンポーネントの実際の高さを計測
   - `grid-template-rows` が期待通りか確認

2. **Fallback: 高さ同期フック**
   ```tsx
   const { rowHeights } = useRowHeightSync(destinations.length);
   ```

---

## 📞 参考情報

- **CLAUDE.md**: プロジェクト全体のガイドライン
- **TEST_LOGGING_AUDIT_2026-02-03.md**: テスト・ロギング監査レポート（全タスク完了済み）
- **Makefile**: 品質チェックコマンド一覧

---

## 🎯 期待される成果物

1. **Phase 9の完全動作**: コメントと手動出荷日が保存→画面反映される
2. **罫線の完全な揃い**: 納入先数に関わらず右端の縦線が揃う
3. **品質チェック通過**: `make quality-check` が0エラー
4. **ドキュメント更新**: 完了タスクにチェック、残課題を明確化

---

**次のチャットで一気に完了させましょう！Good luck! 🚀**
