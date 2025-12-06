# 現在のタスク一覧

**最終更新:** 2025-12-06

> このドキュメントは**現在進行中のタスクと残課題**を一元管理します。
> 完了したタスクは `CHANGELOG.md` に記録され、このファイルから削除されます。

---

## 📊 サマリー

| 優先度 | 件数 | 状態 |
|--------|------|------|
| P1（高） | 1 | 認証依存 |
| P2（中） | 4 | 明日対応予定 |
| P3（低） | 2 | 将来対応 |

---

## P1 - 高優先度

### 担当者ロック表示（排他制御）

**ステータス:** 未実装  
**ブロッカー:** 認証機能との連携

別ユーザーが編集中の場合、「🔒 田中太郎さんが編集中」と表示。

---

## P2 - 中優先度

### 操作ログへのユーザー関連付け

**ステータス:** 一部実装済み

認証機能は実装完了（AuthService, AuthContext, AdminGuard）。

残タスク:
- [ ] 各操作（引当、入荷確定など）で `current_user` を使ってログ記録

関連TODO:
- `AdjustmentForm.tsx:26` - `adjusted_by: 1` → auth contextから取得
- `rpa_router.py:36` - ログインユーザーを使用

### テストデータ生成の改善

**ステータス:** 一部完了

対応済み:
- ✅ 在庫量: フォーキャストの70-90%（制約発生）
- ✅ ロット: 60% 1ロット、30% 2ロット、10% 3ロット
- ✅ フォーキャスト種別: 50% 日別、30% 旬別、20% 月別
- ✅ 受注: 90%がフォーキャスト一致、10%のみ変動

残タスク:
- [ ] 全製品に最低1ロット確保
- [ ] エッジケーステスト用データパターン追加

### コード品質課題

**ESLint (43件):**
- max-lines-per-function 違反: 約20件
- complexity 違反: 約8件
- @typescript-eslint/no-explicit-any: 約6件

**Mypy (約81箇所):**
要注意ファイル:
- `backend/app/services/allocations/utils.py`
- `backend/app/services/inventory/inbound_service.py`
- `backend/app/api/routes/inventory/lots_router.py`

### 定期バッチジョブのスケジューラ設定

**ステータス:** 手動実行のみ

APScheduler または Celery Beat の導入検討。

---

## P3 - 低優先度（将来対応）

### SAP連携の本番化

**ステータス:** モック実装済み

- SAP在庫チェック: ✅ モック実装済み
- SAP受注登録: ✅ モック実装済み
- 本番SAP API接続: ❌ 未実装

関連TODO: `sap_service.py:60` - Replace with actual SAP API integration

### Bulk Import API (マスタ一括登録)

**ステータス:** UI実装済み、Backend未実装

関連TODO:
- `CustomerBulkImportDialog.tsx` - Backend import未実装
- `ProductBulkImportDialog.tsx` - Backend import未実装
- `**/bulk-operation.ts` - bulk-upsert API未実装

---

## ✅ 完了済み（CHANGELOG.mdへ移動済み）

### 認証・権限管理（2025-12）

- [x] Login UI / Debug User Switcher
- [x] Auth Context (Frontend) & `current_user` logic (Backend)
- [x] Role-based Menu Display, AdminGuard

### Hard Allocation（2025-12）

- [x] `confirm_hard_allocation` 実装
- [x] `confirm_hard_allocations_batch` バッチAPI
- [x] Soft/Hard 分割表示（在庫一覧）

---

## 参照

- **変更履歴:** `CHANGELOG.md`
- **完了機能:** `docs/COMPLETED_FEATURES.adoc`
- **開発ガイド:** `CLAUDE.md`
