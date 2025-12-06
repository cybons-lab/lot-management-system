# Tasks Directory

このディレクトリはタスク管理の中心地です。

## 📋 現在の運用

### マスタータスクリスト
**唯一のアクティブタスク管理ドキュメント:** `ACTIVE_TASKS.md`

全ドキュメントから抽出した未完了タスクを優先度別（P0-P3）に統合管理しています。

### タスクの追加・更新ルール

1. **新しいタスクが発生した場合:**
   - `ACTIVE_TASKS.md` の該当する優先度セクションに追記
   - 工数見積と影響範囲を明記

2. **タスクが完了した場合:**
   - 該当行に ✅ マークを追加
   - 必要に応じて `archive/` に詳細ドキュメントを保存

3. **優先度の変更:**
   - `ACTIVE_TASKS.md` 内で該当タスクを移動
   - 理由をコミットメッセージに記載

## 📂 ディレクトリ構造

```
tasks/
├── ACTIVE_TASKS.md          # マスタータスクリスト（現在進行中）
├── README.md                 # このファイル
└── archive/                  # 完了済み・過去のタスク計画
    ├── handoff.md
    ├── ui-improvements.md
    ├── schema-improvements.md
    ├── partial-lock-implementation.md
    ├── error-logging-improvement.md
    └── user-supplier-assignments.md
```

## 🔗 関連ドキュメント

### タスクソース
- `../reports/2025-11/todo-priorities-2025-11-30.md` - TODOコメント分析
- `../reports/2025-11/code-quality-report-2025-11-30.md` - コード品質レポート
- `../reports/2025-11/audit-report-2025-11-30.md` - 孤立ファイル検出

### 完了履歴
- `../archive/COMPLETED_CODE_CLEANUP_20251130.md` - 完了済みクリーンアップタスク
- `../archive/changes/` - 過去の変更履歴（2025-11-29）

### ガイドライン
- `../../CLAUDE.md` - プロジェクト全体のガイドライン
- `../DOCUMENT_GUIDELINES.adoc` - ドキュメント作成ガイドライン

## 🎯 推奨ワークフロー

### 週次レビュー
1. `ACTIVE_TASKS.md` を開く
2. 完了したタスクに ✅ マークを追加
3. 新規タスクがあれば適切な優先度で追加
4. 優先度の見直し（P2→P1への昇格など）

### タスク着手時
1. `ACTIVE_TASKS.md` から次に着手するタスクを選択
2. 必要に応じて詳細設計ドキュメントを `tasks/` に作成
3. 作業開始

### タスク完了時
1. `ACTIVE_TASKS.md` に ✅ マークを追加
2. 詳細な実装ドキュメントがあれば `archive/` に移動
3. 関連する他のタスクへの影響を確認

## 📊 進捗管理

**現在のタスク統計（2025-12-01時点）:**
- 🔴 P0（緊急）: 2件
- 🟠 P1（高）: 13件
- 🟡 P2（中）: 15件
- 🔵 P3（低）: 7件
- **合計:** 37件

詳細は `ACTIVE_TASKS.md` を参照してください。

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-01 | 全面改訂（ACTIVE_TASKS.md 導入） |
| 2025-11-XX | 旧 implementation_plan.md への統合を記載（実際には存在せず） |
