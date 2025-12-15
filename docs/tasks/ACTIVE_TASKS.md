# 現在のタスク一覧

**最終更新:** 2025-12-14

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## ✅ 最近完了したタスク

### P3-4: customer_items / product_mappings 責務分離

**ステータス:** 完了（2025-12-14）

**概要:**
`customer_items` と `product_mappings` の責務を明確化し、ドキュメント整備を実施。

**成果物:**
- [ADR-003](adr/ADR-003_customer_items_product_mappings.md) - 責務分離の設計判断（採用済み）
- [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md) - テーブル責務境界ガイド
- [P3分析レポート](P3_customer_items_product_mappings_analysis.md) - 設計分析

**責務境界:**
| テーブル | ドメイン | 用途 |
|----------|----------|------|
| customer_items | 受注・出荷 | 品番変換、出荷設定、SAP連携 |
| product_mappings | 調達・発注 | 4者マッピング、将来の単価/LT管理 |

---

## 🔥 対応中（P0: 最優先）

### P0-1: 製品マスタの先方品番・メーカー品番が保存されない問題

**ステータス:** 修正中（2025-12-15）

**問題:**
- 商品マスタで先方品番・メーカー品番を入力しても保存時に値が消える
- Productモデルに`customer_part_no`/`maker_item_code`カラムが存在しなかった

**対応:**
- モデルにカラム追加
- マイグレーション実行
- サービス層の削除処理を除去

---

## 📋 将来対応（P1: 高優先度）

### P1-1: 製品マスタの品番体系整理

**概要:**
- `product_code` (製品コード)、`customer_part_no` (先方品番)、`maker_item_code` (メーカー品番) の役割が不明確
- UI表示の一貫性を確保する必要がある
- 必要に応じてスキーマ変更を検討

---

## 📌 将来対応（P2: 中優先度）

### P2-3: SAP在庫同期 - 本番API接続待ち

**現状**: モック実装完了、UI実装完了

**残タスク**（本番SAP接続が必要）:
- ❌ 本番SAP API接続
- ❌ 定期実行設定（オプション）

---

## 📌 将来対応（P3: 低優先度）

### P3-1: SAP受注登録の本番化

**現状:** モック実装済み、本番SAP API接続待ち

---

### P3-5: eslint-disable 低優先度リファクタリング

**現状:** 高・中優先度完了、低優先度のみ残

**残ファイル（7件）:**
- `UserSupplierAssignmentDialog.tsx`
- `AddAssignmentDialog.tsx`
- `SupplierAssignmentEditDialog.tsx`
- `UserDetailPage.tsx`
- `UsersListPage.tsx`
- `ProductMappingsListPage.tsx`
- その他テーブル系コンポーネント

---

## 📊 コード品質

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors** | 0 | ✅ Clean |
| **Ruff Errors** | 0 | ✅ Clean |
| **Backend Tests** | 321 passed | ✅ Clean |

---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **スキーマガイド:** [`docs/SCHEMA_GUIDE.md`](SCHEMA_GUIDE.md)
- **ADR一覧:** [`docs/adr/`](adr/)

