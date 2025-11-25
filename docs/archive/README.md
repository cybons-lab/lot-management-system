# Lot Management System - Documentation Index

## Quick Links

- [CLAUDE.md](../CLAUDE.md) - AI Assistant Guidelines & Project Overview
- [README.md](../README.md) - Project Quick Start
- [SETUP_GUIDE.md](../SETUP_GUIDE.md) - Complete Setup Instructions
- [DOCUMENT_GUIDELINES.adoc](DOCUMENT_GUIDELINES.adoc) - Document Naming Conventions

---

## Documentation Structure

```
docs/
├── README.md                    # このファイル（ドキュメントインデックス）
├── DOCUMENT_GUIDELINES.adoc       # 命名規則・管理ガイドライン
│
├── schema/                      # データベーススキーマ
│   ├── er-diagram-v2.3.md       # ER図（Mermaid）
│   ├── base/
│   │   └── lot_management_schema_v2.3.sql
│   └── current/
│       └── current_openapi.json
│
├── architecture/                # アーキテクチャドキュメント
│   ├── codebase-structure.md
│   ├── api-refactor-plan-v2.2.md
│   └── common-type-candidates.md
│
├── api/                         # APIドキュメント
│   ├── api-reference.md
│   └── api-migration-guide-v2.2.md
│
├── design/                      # 設計書
│   ├── ロット管理システム_概要設計書_v2.2.md
│   └── ビュー設計ガイド.md
│
└── troubleshooting/             # トラブルシューティング
    ├── docker-network-debug.md
    └── db-reset-procedure.md
```

---

## Primary Documentation

### Schema & Database

| Document | Description |
|----------|-------------|
| [ER Diagram v2.3](schema/er-diagram-v2.3.md) | 最新のER図（Mermaid形式、26テーブル） |
| [DDL v2.3](schema/base/lot_management_schema_v2.3.sql) | 最新のデータベーススキーマ |

### Architecture

| Document | Description |
|----------|-------------|
| [Codebase Structure](architecture/codebase_structure.md) | バックエンド・フロントエンド構造 |
| [API Refactor Plan v2.2](architecture/api_refactor_plan_v2.2.md) | APIリファクタリング計画 |
| [Common Type Candidates](architecture/common_type_candidates.md) | 共通型候補（バックエンド・フロントエンド統合） |

### API Reference

| Document | Description |
|----------|-------------|
| [API Reference](api/api_reference.md) | 完全なAPIリファレンス |
| [API Migration Guide v2.2](api/api_migration_guide_v2.2.md) | v2.2へのAPI移行ガイド |

### Design Documents

| Document | Description |
|----------|-------------|
| [概要設計書 v2.2](design/ロット管理システム_概要設計書_v2.2.md) | 最新の概要設計書 |
| [ビュー設計ガイド](design/ビュー設計ガイド.md) | UIビュー設計ガイドライン |
| [業務担当者向け DB かんたんガイド](design/業務担当者向けDBガイド.md) | 一般事務向けのテーブル・データフロー入門 |

### Troubleshooting

| Document | Description |
|----------|-------------|
| [Docker Network Debug](troubleshooting/docker-network-debug.md) | Dockerネットワーク問題の解決 |
| [DB Reset Procedure](troubleshooting/db-reset-procedure.md) | データベースリセット手順 |

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v2.3 | 2025-11 | Schema v2.3, ER diagram, document reorganization |
| v2.2 | 2025-11 | API refactoring complete |
| v2.0 | 2024-11 | Initial system rewrite |

---

## Document Management

### Principles

1. **Git is the archive** - 不要なドキュメントは削除（Gitで復元可能）
2. **Keep it simple** - 必要最小限のドキュメントのみ保持
3. **Update or delete** - 古くなったら更新するか削除
4. **Follow naming conventions** - [DOCUMENT_GUIDELINES.adoc](DOCUMENT_GUIDELINES.adoc) 参照

### Adding New Documents

1. カテゴリを決定（schema / architecture / api / design / troubleshooting）
2. [命名規則](DOCUMENT_GUIDELINES.adoc)に従ってファイル名を決定
3. 適切なフォルダに配置
4. このインデックスを更新
5. 必要に応じて CLAUDE.md も更新

### Updating Documents

1. 既存ファイルを直接編集
2. バージョン番号更新が必要な場合はファイル名も変更
3. 旧バージョンは削除（Gitで復元可能）

---

**Last Updated**: 2025-11-19
