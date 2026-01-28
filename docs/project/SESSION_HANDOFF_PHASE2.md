# Phase2 セッション引き継ぎプロンプト

**作成日:** 2026-01-28
**ブランチ:** `fix/supplier-product-registration-error`

---

## 次のセッションへの指示

以下をそのままコピーして新しいセッションに貼り付けてください：

---

### プロンプト開始

Phase2のUIラベル修正を継続してください。

**背景:**
- 2コード体系: `maker_part_no`（メーカー品番）と `customer_part_no`（先方品番）
- 在庫画面では `product_code` が実質 `maker_part_no` を表すが、UIで「先方品番」と誤表示されている箇所がある
- 「先方品番」は得意先品番の社内慣用語なのでそのまま維持（「得意先品番」に変えない）

**完了済み:**
- ✅ InventoryByProductTable.tsx: header「メーカー品番」
- ✅ ProductGroupHeader.tsx: label「メーカー品番」
- ✅ InventoryTableColumns.tsx: title="メーカー品番"
- ✅ LotDetailPage.tsx: 「メーカー品番: xxx」形式
- ✅ 計画書更新: `docs/project/CODE_SYSTEM_DEFINITION.md`

**残りの作業（Phase2-A）:**
在庫関連画面で `product_code` を「先方品番」と表示している以下を「メーカー品番」に修正：

1. `frontend/src/features/inventory/components/LotCreateForm.tsx:65`
   - 「先方品番 *」→「メーカー品番 *」

2. `frontend/src/features/inventory/utils/lot-columns.tsx:57`
   - header: 「先方品番」→「メーカー品番」

3. `frontend/src/features/inventory/hooks/useLotColumns.tsx:123`
   - header: 「先方品番」→「メーカー品番」

4. `frontend/src/features/inventory/components/LotEditFields.tsx:24`
   - 「先方品番」→「メーカー品番」

5. `frontend/src/features/inventory/components/excel-view/ProductHeader.tsx:98`
   - 「先方品番」→「メーカー品番」

**注意:**
- 得意先関連画面（customer_items, shipping-master等）の「先方品番」はそのまま維持
- `customer_part_no` を表示している箇所は変更しない

**完了後:**
1. `npm run typecheck` と `npm run lint` を実行
2. コミット（メッセージ例: `fix(frontend): Change 先方品番 to メーカー品番 in inventory lot screens`）

**将来の作業（Phase2-B、今回は対象外）:**
- `product_code` → `maker_part_no` へのフィールド名統一（API + フロントエンド全体の置換）

---

### プロンプト終了

---

## 関連ファイル

- `docs/project/CODE_SYSTEM_DEFINITION.md` - 計画詳細
- `CLAUDE.md` - プロジェクト概要

## 最新コミット

```
07a9d7fa docs: Add Phase2 plan for UI labels and field name unification
4dbfc354 fix(frontend): Clarify product code labels as メーカー品番 in inventory views
```
