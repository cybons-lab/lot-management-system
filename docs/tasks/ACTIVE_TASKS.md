# 現在のタスク一覧

**最終更新:** 2025-12-07

> このドキュメントは**現在進行中のタスクと残課題**を一元管理します。
> 完了したタスクは `CHANGELOG.md` に記録され、このファイルから削除されます。

---

## 📊 サマリー

| 優先度 | 件数 | 状態 |
|--------|------|------|
| P1（高） | 0 | 完了 |
| P2（中） | 2 | 対応中 |
| P3（低） | 3 | 将来対応 |

---

## 📋 抑制コメント まとめ

| 種類 | 件数 | カテゴリ |
|------|------|----------|
| eslint-disable | 39件 | Frontend Lint |
| @typescript-eslint/no-explicit-any | 1件 | (external-modules.d.tsのみ) |
| type: ignore | 0件 | Backend Mypy ✅ |
| noqa | 42件 | Backend Ruff (意図的) |
| pragma: no cover | 5件 | テストカバレッジ除外（正常） |
| TODO | 9件 | 未完了タスク（バックエンド待ち） |

### � eslint-disable (39件) 内訳:
- `max-lines-per-function`: 約25件（関数分割を検討）
- `complexity`: 約8件
- `max-params`: 1件
- `jsx-a11y`: 1件

### 🔴 残りのTODO（9件）- 全てバックエンド待ち

| ファイル | 内容 | 対応時期 |
|----------|------|----------|
| `CustomerBulkImportDialog.tsx` | Backend import未実装 | P3 |
| `ProductBulkImportDialog.tsx` | Backend import未実装 | P3 |
| `useWarehouseData.ts` | 入荷予定を倉庫別に集約 | P2-23 |
| `useAllocationMutations.ts` (2件) | バックエンドAPI待ち | 将来 |
| `sap_service.py` | 本番SAP API統合 | P3 |
| `suggestion.py` | 削除範囲の最適化 | 将来 |

---

## P2 - 中優先度

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

### Bulk Import API (マスタ一括登録)

**ステータス:** UI実装済み、Backend未実装

### 担当者ロック表示（排他制御）のバックエンド実装

**ステータス:** UI実装済み、バックエンド未実装

---

## ✅ 完了済み（CHANGELOG.mdへ移動済み）

### 認証・権限管理（2025-12）

- [x] Login UI / Debug User Switcher
- [x] Auth Context (Frontend) & `current_user` logic (Backend)
- [x] Role-based Menu Display, AdminGuard
- [x] 操作ログへのユーザー関連付け（AdjustmentForm, RPA）

### Hard Allocation（2025-12）

- [x] `confirm_hard_allocation` 実装
- [x] `confirm_hard_allocations_batch` バッチAPI
- [x] Soft/Hard 分割表示（在庫一覧）

### コード品質改善（2025-12-07）

- [x] フィルタをID検索から名前検索に変更（SearchableSelect導入）
- [x] ESLint: 0エラー/0ワーニング
- [x] Mypy: 0エラー（types-PyYAML追加、型アノテーション修正）
- [x] pre-commit設定改善（docformatter削除、ruff統一）
- [x] no-explicit-any: 5件 → 1件（external-modules.d.tsのみ）
- [x] system_router.py: ユーザー名をJoinで取得

---

## 参照

- **変更履歴:** `CHANGELOG.md`
- **完了機能:** `docs/COMPLETED_FEATURES.adoc`
- **開発ガイド:** `CLAUDE.md`
