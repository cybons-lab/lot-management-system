# 未完了タスク一覧

**最終更新:** 2025-12-21

---

## P1: 高優先度

### P1-1: 製品マスタの品番体系整理

**概要:**
- `product_code`, `customer_part_no`, `maker_item_code` の役割が不明確
- UI表示の一貫性を確保する必要がある
- 必要に応じてスキーマ変更を検討

---

## P2: 中優先度

### P2-4: フォーキャスト単位での引当推奨生成

**概要:**
- 現在「引当推奨生成」ボタンは全期間の全フォーキャストに対して一括で実行される
- 特定のフォーキャストグループ（顧客×納入先×製品）単位で引当推奨を生成したい
- 他の担当者の分を巻き込まないようにスコープを限定できるようにする

**対応案:**
- ForecastDetailCard内に「このグループの引当推奨を生成」ボタンを追加
- `/api/v2/forecast/suggestions/preview` にフィルタリングパラメータを追加

---

## P3: 低優先度

### P3-5: eslint-disable 低優先度リファクタリング

**残ファイル（7件）:**
- `UserSupplierAssignmentDialog.tsx`
- `AddAssignmentDialog.tsx`
- `SupplierAssignmentEditDialog.tsx`
- `UserDetailPage.tsx`
- `UsersListPage.tsx`
- `ProductMappingsListPage.tsx`
- その他テーブル系コンポーネント

---

## 保留

### フォーキャスト編集後の更新問題

**概要:**
- フォーキャスト編集後、計画引当サマリ・関連受注が更新されない
- 手動リフレッシュで回避可能

**対応案:**
- バックエンド調査（related_orders再計算確認）
- クエリ無効化方法の改善
- 楽観的更新の実装

**優先度:** 低
