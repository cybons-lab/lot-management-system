# 現在のタスク一覧

**最終更新:** 2025-12-11

> **このドキュメントの目的**: 
> - **未対応**または**進行中**のタスクのみを記載
> - **完了したタスク**は`CHANGELOG.md`に記録され、このファイルからは削除される
> - 常に「今やるべきこと」だけが載っている状態を維持

---

## 🚧 残タスク（P1: 高優先度）





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
