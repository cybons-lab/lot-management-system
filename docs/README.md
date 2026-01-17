# ロット管理システム ドキュメント (Lot Management System Documentation)

## ドキュメント体系

本ディレクトリ (`/docs`) には、システムの設計、仕様、運用に関するドキュメントが格納されています。

| カテゴリ | ファイル | 内容 |
| :--- | :--- | :--- |
| **Architecture** | [overview.md](architecture/overview.md) | システム全体構成、コンポーネント責務、技術スタック |
| | [frontend.md](architecture/frontend.md) | フロントエンドアーキテクチャ、ディレクトリ構成 |
| **Domain** | [rules.md](domain/rules.md) | **【最重要】** ロット管理ルール（在庫定義、引当ロジック等） |
| | [glossary.md](domain/glossary.md) | 用語集 |
| | [state_machines.md](domain/state_machines.md) | 状態遷移図（Lot/Reservation/OrderLine） |
| **Database** | [schema.md](db/schema.md) | テーブル一覧、マスタ/トランザクション構成 |
| | [data_dictionary.md](db/data_dictionary.md) | 主要テーブルのカラム定義 |
| | [er_diagram.md](db/er_diagram.md) | ER図 |
| **API** | [api.md](api/api.md) | APIのエンドポイント概要 |
| **Flows** | [core_flows.md](flows/core_flows.md) | 主要フロー（入庫、引当、確定）のシーケンス図 |
| **Quality** | [invariants.md](quality/invariants.md) | システムが保証すべき不変条件・整合性ルール |
| **Operations** | [runbook.md](ops/runbook.md) | 運用手順（監視、データ補正） |
| | [troubleshooting.md](ops/troubleshooting.md) | トラブルシューティングガイド |
| **Testing** | [test_strategy.md](testing/test_strategy.md) | テスト戦略、観点 |
| **Development** | [setup.md](dev/setup.md) | 開発環境セットアップ手順 |
| **Tasks** | [backlog.md](tasks/backlog.md) | 未完了タスクのバックログ |
| | [TODO.md](TODO.md) | 未実装APIなどのTODO |

## 読み進め方

1. 全体像を把握したい場合: `architecture/overview.md`
2. 業務ルールを知りたい場合: `domain/rules.md` (ここが核心です)
3. DB構造を調べたい場合: `db/schema.md` -> `db/er_diagram.md`
4. 開発環境を構築したい場合: `dev/setup.md`

## 補足
- 本ドキュメントはリポジトリのコード (`backend/`, `frontend/`) およびDB定義を正本として作成されています。
- 仕様が不明確な点は `要確認ポイント` として別途リストアップされています。
