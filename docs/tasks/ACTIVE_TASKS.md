# 現在のタスク一覧

**最終更新:** 2025-12-11

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## 🚧 残タスク（P1: 高優先度）

### P1-7: 論理削除導入後の参照エラー修正

**ステータス:** 完了 ✅

**概要:**
在庫管理、需要予測などの画面で500エラーが多発している。
論理削除されたマスタ（Supplier, Product等）を参照している箇所（`joinedload`等）で、データ不整合や想定外の `null` が発生している可能性が高い。

**完了した対応:**
- ✅ v_lot_details, v_order_line_details に COALESCE 追加
- ✅ VLotDetails, VOrderLineDetails に *_deleted フラグ追加
- ✅ LotResponse スキーマに削除フラグ追加
- ✅ フロントエンド lot-columns.tsx で削除済み表示対応
- ✅ create_views_v2.sql に欠落ビュー定義を追加（v_order_line_context等）
- ✅ VInventorySummary のカラム不一致修正
- ✅ Bulk Upsert での valid_to フィルタ追加
- ✅ サービス層でのsoft-delete対応（soft_delete_utils.py追加）
- ✅ forecast_service, withdrawal_service, order_service の削除済みマスタ対応

---

### P1-7a: ビュー定義の整合性修正

**ステータス:** 完了 ✅

**概要:**
create_views_v2.sql に定義されていないビューがあり、マイグレーション実行時にエラーが発生する可能性があった。

**完了した対応:**
- ✅ create_views_v2.sql に欠落ビュー定義を追加（11個）
- ✅ VInventorySummary ORM モデルを更新
- ✅ bulk_upsert メソッドに valid_to フィルタを追加（4サービス）

---



## 📌 将来対応（P2: 中優先度）

### P2-2: フォーキャスト編集後の画面更新問題

**ステータス:** 保留（優先度: 低）

手動リフレッシュで回避可能。バックエンド調査が必要な可能性あり。

詳細: [`docs/tasks/forecast-update-issue.md`](forecast-update-issue.md)

---

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
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
