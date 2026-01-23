# ロット管理システム ドキュメント (Lot Management System Documentation)

## ドキュメント体系

本ディレクトリ (`/docs`) には、システムの設計、仕様、運用に関するドキュメントが格納されています。

| カテゴリ | ファイル | 内容 |
| :--- | :--- | :--- |
| **Specifications (仕様)** | [domain/rules.md](specifications/domain/rules.md) | **【最重要】** ロット管理ルール（在庫定義、引当ロジック等） |
| | [db/schema.md](specifications/db/schema.md) | テーブル一覧、マスタ/トランザクション構成 |
| | [flows/core_flows.md](specifications/flows/core_flows.md) | 主要フロー（入庫、引当、確定）のシーケンス図 |
| | [api/api.md](specifications/api/api.md) | APIのエンドポイント概要 |
| **Development (開発)** | [setup/setup.md](development/setup/setup.md) | 開発環境セットアップ手順 |
| | [architecture/overview.md](development/architecture/overview.md) | システム全体構成、コンポーネント責務、技術スタック |
| | [standards/frontend-style-guide.md](development/standards/frontend-style-guide.md) | フロントエンドコーディング規約 |
| | [testing/test_strategy.md](development/testing/test_strategy.md) | テスト戦略、観点 |
| **Operations (運用)** | [runbook.md](operations/runbook.md) | 運用手順（監視、データ補正） |
| | [troubleshooting.md](operations/troubleshooting.md) | トラブルシューティングガイド |
| **Project (案件管理)** | [tasks/backlog.md](project/tasks/backlog.md) | 未完了タスクのバックログ |
| | [plans/ui_and_lifecycle_plan.md](project/plans/ui_and_lifecycle_plan.md) | 開発計画・ロードマップ |
| **Features (機能別)** | [rpa/material_delivery_note_overview.md](features/rpa/material_delivery_note_overview.md) | 各機能固有の仕様・設計 |

## 読み進め方

1. 全体像を把握したい場合: [overview.md](development/architecture/overview.md)
2. 業務ルールを知りたい場合: [rules.md](specifications/domain/rules.md) (ここが核心です)
3. DB構造を調べたい場合: [schema.md](specifications/db/schema.md) -> [er_diagram.md](specifications/db/er_diagram.md)
4. 開発環境を構築したい場合: [setup.md](development/setup/setup.md)

## 補足
- 本ドキュメントはリポジトリのコード (`backend/`, `frontend/`) およびDB定義を正本として作成されています。
- 仕様が不明確な点は `要確認ポイント` として別途リストアップされています。
