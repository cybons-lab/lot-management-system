# Tasks Directory

このディレクトリには、ロット管理システムの**進行中、計画中、または保留中のタスク**をまとめています。

## 📋 ディレクトリの目的

- 実装予定の機能や改善の計画を一元管理
- セッション間の引き継ぎ情報を保持
- タスクの優先順位と進捗状況を明確化

## 📁 ファイル一覧

### 進行中・次回対応のタスク

#### `handoff.md`
セッション間の引き継ぎドキュメント。

**内容:**
- 前回完了した作業
- 次のセッションで対応すべき事項
- 優先度別のタスクリスト

**最終更新:** 2025-11-27

---

#### `ui-improvements.md`
フロントエンドのUI改善課題。

**タスク:**
- ✅ 倉庫表示バグ修正（完了）
- 🔄 SAP受注登録UI v2（仕様見直し中）

**優先度:** Medium

---

### 計画中のタスク

#### `schema-improvements.md`
データベーススキーマの改善計画（`user-supplier-assignments.md`と統合して実装中）。

**主要タスク:**
- ✅ `version_id` → `version` 変更
- ✅ `customer_items` 拡張（出荷表テキスト対応）
- ✅ `customer_item_jiku_mappings` テーブル追加
- ✅ `order_lines` 拡張（shipping_document_text）
- ✅ 7つのビュー修正
- ✅ バックエンドAPI実装
- 🔄 フロントエンド実装（未着手）

**優先度:** High
**見積もり作業時間:** 残り8時間

---

#### `error-logging-improvement.md`
エラーロギングとハンドリング機能の改善計画。

**主要タスク:**
1. フロントエンドエラーロギングの実装
2. データベースエラーのユーザーフレンドリー化
3. ✅ JWT認証のオプショナル認証実装（完了）

**優先度:** Medium
**ステータス:** 計画中

---

#### `user-supplier-assignments.md`
ユーザー-仕入先担当割り当て機能の実装計画（`schema-improvements.md`に統合済み）。

**主要タスク:**
- ✅ `user_supplier_assignments` テーブル追加
- ✅ AssignmentService 実装
- ✅ API エンドポイント実装
- 🔄 フロントエンド UI 実装（未着手）

**優先度:** Medium
**見積もり作業時間:** 残りUI実装のみ

---

## 🔄 タスクのライフサイクル

```
計画中 → 実装中 → レビュー中 → 完了 → アーカイブ
```

### 完了したタスクの扱い

タスクが完了したら：

1. **ファイルを更新**
   - ステータスを「✅ 完了」にマーク
   - 完了日を記載

2. **適切な場所に移動**
   - 実装記録 → `docs/implementation/`
   - 変更履歴 → `docs/CHANGELOG_*.md`
   - 参考資料 → `docs/architecture/`

3. **このディレクトリから削除**
   - 完了したタスクはこのディレクトリから削除してOK
   - 必要に応じて別の場所に記録を保持

---

## 📝 新しいタスクの追加方法

新しいタスクを追加する場合：

1. **ファイル作成**
   ```bash
   # 例: 新機能の実装計画
   touch docs/tasks/new-feature-plan.md
   ```

2. **必須項目を記載**
   - タスクの概要と背景
   - 主要な実装内容
   - 見積もり作業時間
   - 優先度（High / Medium / Low）
   - 依存関係

3. **このREADMEを更新**
   - ファイル一覧に追加
   - 適切なセクションに分類

---

## 🏷️ タスクの優先度

| 優先度 | 説明 | 対応時期 |
|--------|------|----------|
| **High** | 重要かつ緊急。次回セッションで優先的に対応 | すぐに |
| **Medium** | 重要だが緊急ではない。計画的に対応 | 1-2週間以内 |
| **Low** | 将来的な改善。時間があれば対応 | 長期計画 |

---

## 🔗 関連ドキュメント

- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のガイド
- [README.md](../../README.md) - プロジェクト概要
- [SETUP_GUIDE.md](../../SETUP_GUIDE.md) - セットアップガイド
- [docs/architecture/](../architecture/) - アーキテクチャドキュメント
- [docs/implementation/](../implementation/) - 実装記録

---

## 📊 現在のタスク概要

| ファイル | 優先度 | ステータス | 作業時間 |
|---------|--------|-----------|---------|
| schema-improvements.md | High | 実装中 (Phase D完了) | 残8h |
| error-logging-improvement.md | Medium | 計画中 | - |
| ui-improvements.md | Medium | 仕様見直し中 | - |
| user-supplier-assignments.md | Medium | 実装中 (API完了) | 残UIのみ |

---

**最終更新:** 2025-11-28
