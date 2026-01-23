# レビュー・意思決定の統合記録 (REVIEW_HISTORY_CONSOLIDATED)

このドキュメントは、過去に実施されたコードレビュー、設計レビュー、および主要な意思決定の記録を一つにまとめたものです。
現在のアクションアイテム（未対応の課題）はすべて [FUTURE_IMPROVEMENTS.md](../tasks/FUTURE_IMPROVEMENTS.md) に集約されています。

---

## 2026-01-19: 商品識別設計レビュー
**元ファイル**: `PRODUCT_IDENTIFICATION_DESIGN_REVIEW.md`

### 概要
商品マスタと得意先品番マッピングの設計妥当性をレビュー。ビジネス要件（先方品番中心）と実装（メーカー品番中心）の乖離が指摘された。

### 対応状況
- [x] **Service層のデータ損失修正**: `customer_items_service.py` が一部フィールドを返していなかったバグを修正。
- [ ] **ビジネス要件への適合**: 先方品番を主軸とした設計への見直し。
  - → [FUTURE_IMPROVEMENTS.md: 商品識別設計のビジネス実態への適合](../tasks/FUTURE_IMPROVEMENTS.md#商品識別設計のビジネス実態への適合) へ移行。

---

## 2026-01-18: コードレビュー指摘事項に関する意思決定
**元ファイル**: `20260118_review_findings.md`

### 決定事項
- [x] **アラート条件の修正**: `collect_order_alerts` の判定条件を `status="open"` に統一。
- [x] **自動引当失敗時の挙動**: 現状はログ出力（WARNING）のみとし、将来的にリトライ機構等を検討する。
  - → 詳細は [FUTURE_IMPROVEMENTS.md: 在庫計算ロジックの厳密化とSSOT固定](../tasks/FUTURE_IMPROVEMENTS.md#在庫計算ロジックの厳密化とssot固定) に関連。

---

## 2026-01-16: 在庫・ロット管理機能レビュー
**元ファイル**: `inventory-lot-management-review_merged.md`, `inventory_lot_review.md` 等

### 概要
在庫・ロット管理機能のUI/UX、設計、DB構成を徹底レビュー。データモデルの正規化や計算ロジックの不備が多数指摘された。

### 決定事項と対応状況
- [x] **モデル名のリネーム**: `Lot` → `LotReceipt` (入荷実体) へ変更。
- [x] **ロット番号の一本化**: `lot_master` テーブルを新設し、重複を排除。
- [ ] **計算ロジックのSSOT固定**: 利用可能在庫の計算式不備の解消。
  - → [FUTURE_IMPROVEMENTS.md: 在庫計算ロジックの厳密化とSSOT固定](../tasks/FUTURE_IMPROVEMENTS.md#在庫計算ロジックの厳密化とssot固定) へ移行。
- [ ] **スケーラビリティ対応**: 100件上限の撤廃とサーバーサイドページング。
  - → [FUTURE_IMPROVEMENTS.md: 大量データ表示の完全対応](../tasks/FUTURE_IMPROVEMENTS.md#大量データ表示の完全対応-ページネーション) へ移行。
- [ ] **DBトリガーによる自動同期**:
  - → [FUTURE_IMPROVEMENTS.md: DB整合性維持の自動化](../tasks/FUTURE_IMPROVEMENTS.md#db整合性維持の自動化-db-triggers) へ移行。

---

## 付録: 削除されたドキュメント
以下のファイルはこの統合記録の作成に伴い削除されました：
- `docs/project/decisions/20260118_review_findings.md`
- `docs/project/reviews/inventory_lot_review.md`
- `docs/project/reviews/inventory-lot-management-review_merged.md`
- `docs/project/reviews/inventory-lot-management-review.md`
- `docs/project/reviews/PRODUCT_IDENTIFICATION_DESIGN_REVIEW.md`
