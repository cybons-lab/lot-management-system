# 現在のタスク一覧

**最終更新:** 2025-12-05

> このドキュメントは**現在進行中のタスクのみ**を管理します。
> 完了したタスクは `CHANGELOG.md` に記録され、このファイルから削除されます。

---

## 📊 サマリー

| 優先度 | 件数 | ステータス |
|--------|------|-----------|
| P1（高） | 2 | 実施可能 |
| P2（中） | 4 | 実施可能 |
| P3（低） | 3 | 将来対応 |

---

## P1 - 高優先度

### Backend コード品質

- [ ] (なし)

---

## P2 - 中優先度

## P2 - 中優先度

### 認証・権限管理（テスト・監査対応）

- [x] **簡易認証とユーザー切り替え**
    - [x] Login UI / Debug User Switcher
    - [x] Auth Context (Frontend) & `current_user` logic (Backend)
- [x] **権限による表示制御**
    - [x] Role-based Menu Display (Admin vs User)
    - [x] AdminGuard for protected routes

### システム基盤・デバッグ

- [ ] **システムログ表示機能**
    - [ ] 管理メニュー → システムログ一覧画面
    - [ ] Backend: system_logs テーブルの読み取りAPI
    - [ ] Frontend: ログ閲覧コンポーネント（フィルタ・検索機能付き）

- [ ] **クライアントログ収集・閲覧機能**
    - [ ] Backend: `client_logs` テーブル設計 & `POST /system/logs` API
    - [ ] Frontend: `Logger` ユーティリティ実装 & API連携
    - [ ] UI: システム管理 - ログ閲覧画面の実装

- [ ] (完了) **全受注の自動引当実装** -> CHANGELOGへ移動

---

## P3 - 低優先度（将来対応）

- [ ] **SAP API統合の本番化** - 現在モック実装
- [ ] **定期バッチジョブのスケジューラ設定** - 手動実行のみ
- [ ] **担当者ロック表示（排他制御）** - 認証機能依存

---

## 参照

- **変更履歴:** `CHANGELOG.md`
- **残課題詳細:** `docs/remaining_issues.adoc`
- **開発ガイド:** `CLAUDE.md`
