# 現在のタスク一覧

**最終更新:** 2025-12-07

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## 🎯 残タスク（今すぐ対応が必要）

### 🚀 機能実装: マスタ一括インポート (Master Import)

**現状**: フェーズ2完了（CSV廃止 + 統合インポートへの移行）
**残タスク**:
- [x] フェーズ1: バックエンド基盤 ✅
- [x] フェーズ1: フロントエンド実装 (`MastersBulkLoadPage`) ✅
- [x] フェーズ2: CSV廃止 + Excel対応 ✅
  - suppliers, customers, supplier-productsページを統合インポートにリダイレクト
  - warehouses, uom-conversionsは現行CSV維持（マスタインポートAPI未対応）
- [ ] フェーズ3: 初期化機能 + 統合UI


---

## 🔜 近い将来対応予定

### P2-1: SAP在庫同期 - 本番API接続待ち

**現状**: モック実装完了、UI実装完了

**残タスク**（本番SAP接続が必要）:
- ❌ **本番SAP API接続**（現在はモック: `SAPMockClient`）
  - `backend/app/external/sap_mock_client.py` を実際のSAP APIクライアントに置き換え
- ❌ **定期実行設定**（オプション）
  - APScheduler または Celery Beat による自動スケジュール実行
  - 実行頻度設定UI

> **Note**: モック環境で実装可能な部分（UI、API、差異検出ロジック）は全て完了。本番SAP環境準備後に対応。


---

## 📌 将来対応（P3: 低優先度）

### 1. SAP受注登録の本番化

**現状:**
- ✅ SAP受注登録: モック実装済み
- ❌ 本番SAP API接続: 未実装

**関連TODO:**
- `backend/app/services/sap/sap_service.py:L61`

---

## 📊 コード品質

### ツール実行結果

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors** | 0 | ✅ Clean |
| **Ruff Errors** | 0 | ✅ Clean |
| **Backend Tests** | 283 passed, 0 failed | ✅ Clean |

### コード品質無視コメント

| 種類 | 件数 | 状態 |
|------|------|------|
| Mypy `# type: ignore` | 40 | ✅ 許容済み |
| Ruff `# noqa` | 53 | ✅ 許容済み |
| ESLint `eslint-disable` | 22 | ✅ 許容済み |
| TypeScript `@ts-ignore` | 0 | ✅ Clean |
| **合計** | **115** | **全て許容済み (2025-12-07)** |

> 詳細な許容理由は [`docs/CODE_QUALITY_IGNORES.md`](../CODE_QUALITY_IGNORES.md) を参照


---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
