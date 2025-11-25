# ロット管理システム ドキュメント索引

最終更新: 2025-11-25

---

## 📚 概要

本ドキュメントは、ロット管理システム (Lot Management System) の技術ドキュメント全体の索引です。
散在していたドキュメントを機能別に統合し、参照性を向上させました。

---

## 📖 統合ドキュメント一覧

### 1. [データベーススキーマ関連](./CONSOLIDATED_SCHEMA.md)

**統合元**: 6ファイル
- `schema_fix_rules.md`
- `schema_consistency_report.md`
- `SCHEMA_FIX_REPORT.md`
- `docs/er_diagram.md`
- `docs/schema/er-diagram-v2.3.md`
- `docs/design/ビュー設計ガイド.md`

**内容**:
- データベーススキーマ設計ルール
- ER図 (Mermaid形式、v2.3対応)
- ビュー設計ガイドライン
- スキーマ整合性レポート
- バックエンド優先のスキーマ修正方針

**対象読者**: バックエンド開発者、DB設計者

---

### 2. [フォーキャスト（需要予測）関連](./CONSOLIDATED_FORECAST.md)

**統合元**: 5ファイル
- `FORECAST_TEST_DATA_INVESTIGATION.md`
- `docs/forecast_issue_summary.md`
- `docs/forecast_data_generation_refactor.md`
- `docs/forecast-generation-refactor-plan.md`
- `docs/seed_data_generators_comparison.md`

**内容**:
- フォーキャストデータ構造
- 日別・旬別・月別の予測生成ロジック
- CustomerItem-based vs Product-based 予測生成
- シードデータ vs テストデータの違い
- Phase 1リファクタリング計画

**対象読者**: バックエンド開発者、業務担当者

---

### 3. [ロット引当・推奨機能関連](./CONSOLIDATED_ALLOCATION.md)

**統合元**: 3ファイル
- `docs/allocations/allocation_suggestion_spec_v2.md`
- `docs/allocations/allocation_suggestion_design.md`
- `docs/lot-allocation-ui-improvement-spec-integrated.md`

**内容**:
- FEFO (First-Expired, First-Out) ロジック
- ソフトアロケーション vs ハードアロケーション
- 引当推奨API仕様
- ロット引当画面UI改善仕様（Phase 1～5完了）
- `generated_for_month`廃止版設計

**対象読者**: フルスタック開発者、UI/UX担当者

---

### 4. [トラブルシューティング](./CONSOLIDATED_TROUBLESHOOTING.md)

**統合元**: 2ファイル
- `docs/troubleshooting/docker-network-debug.md`
- `docs/troubleshooting/db-reset-procedure.md`

**内容**:
- Docker Network デバッグガイド
- Frontend → Backend 接続エラー対処法
- データベース状態確認とリセット手順
- VIEW作成手順
- クイックリファレンス（よく使うコマンド集）

**対象読者**: 全開発者、インフラ担当者

---

### 5. [フロントエンド開発関連](./CONSOLIDATED_FRONTEND.md)

**統合元**: 4ファイル
- `frontend/CHANGELOG.md`
- `frontend/STYLE_GUIDE.md`
- `frontend/REFACTORING_SUMMARY.md`
- `frontend/ESLINT_ISSUES.md`

**内容**:
- フロントエンド変更履歴 (Changelog)
- スタイルガイド（Tailwind CSSの使用方針）
- ESLint Flat Config導入記録
- Feature-based directory構造への移行
- LotAllocationPage大規模リファクタリング記録 (941→169行)
- 残存ESLint問題の詳細

**対象読者**: フロントエンド開発者

---

### 6. [その他技術実装](./CONSOLIDATED_MISC.md)

**統合元**: 1ファイル
- `docs/unit-conversion-implementation.md`

**内容**:
- データベース駆動の単位換算システム実装
- `product_uom_conversions` テーブル設計
- 自動引当・ステータス計算のバグ修正記録

**対象読者**: バックエンド開発者、フロントエンド開発者

---

## 📂 プロジェクト全体のドキュメント構造

```
lot-management-system/
├── README.md                       # プロジェクト概要
├── CLAUDE.md                       # AI開発ガイド（最重要）
├── SETUP_GUIDE.md                  # セットアップ手順
├── docs/
│   ├── INDEX.md                    # このファイル（ドキュメント索引）
│   ├── CONSOLIDATED_SCHEMA.md      # DB スキーマ統合
│   ├── CONSOLIDATED_FORECAST.md    # 需要予測統合
│   ├── CONSOLIDATED_ALLOCATION.md  # ロット引当統合
│   ├── CONSOLIDATED_TROUBLESHOOTING.md # トラブルシューティング統合
│   ├── CONSOLIDATED_FRONTEND.md    # フロントエンド統合
│   ├── CONSOLIDATED_MISC.md        # その他技術実装統合
│   ├── architecture/               # アーキテクチャドキュメント
│   ├── schema/                     # スキーマ関連（個別ファイル）
│   ├── allocations/                # 引当関連（個別ファイル）
│   └── troubleshooting/            # トラブルシューティング（個別ファイル）
├── backend/
│   └── (バックエンドコード)
└── frontend/
    └── (フロントエンドコード)
```

---

## 🔍 目的別ドキュメント参照ガイド

### データベース設計を理解したい
→ [CONSOLIDATED_SCHEMA.md](./CONSOLIDATED_SCHEMA.md)
- ER図を参照
- ビュー設計ガイドを確認

### FEFO引当ロジックを理解したい
→ [CONSOLIDATED_ALLOCATION.md](./CONSOLIDATED_ALLOCATION.md)
- 「引当推奨機能（ソフトアロケーション）仕様書 v2.0」セクション
- 「Allocation Suggestion Design（最終版）」セクション

### フォーキャストデータの生成方法を知りたい
→ [CONSOLIDATED_FORECAST.md](./CONSOLIDATED_FORECAST.md)
- 「Forecast Data Generation Refactor」セクション
- 「Seed Data Generators Comparison」セクション

### Docker接続エラーのトラブルシューティング
→ [CONSOLIDATED_TROUBLESHOOTING.md](./CONSOLIDATED_TROUBLESHOOTING.md)
- 「Docker Network Debugging Guide」セクション

### データベースをリセットしたい
→ [CONSOLIDATED_TROUBLESHOOTING.md](./CONSOLIDATED_TROUBLESHOOTING.md)
- 「DB状態確認とリセット手順」セクション

### フロントエンドのコーディング規約を確認したい
→ [CONSOLIDATED_FRONTEND.md](./CONSOLIDATED_FRONTEND.md)
- 「Style Guide（スタイルガイド）」セクション

### リファクタリングの履歴を知りたい
→ [CONSOLIDATED_FRONTEND.md](./CONSOLIDATED_FRONTEND.md)
- 「Refactoring Summary（リファクタリング要約）」セクション

### 単位換算システムの実装詳細を知りたい
→ [CONSOLIDATED_MISC.md](./CONSOLIDATED_MISC.md)
- 「Unit Conversion System Implementation」セクション

---

## 🚀 新規開発者向けクイックスタート

1. **まず読むべき**: [../CLAUDE.md](../CLAUDE.md)
   - プロジェクト全体の構造
   - 技術スタック
   - コーディング規約
   - 開発ワークフロー

2. **環境構築**: [../SETUP_GUIDE.md](../SETUP_GUIDE.md)
   - Docker Compose セットアップ
   - ローカル開発環境構築

3. **データベース理解**: [CONSOLIDATED_SCHEMA.md](./CONSOLIDATED_SCHEMA.md)
   - ER図でデータ構造を把握
   - ビュー設計ガイドで集計方法を理解

4. **トラブルシューティング**: [CONSOLIDATED_TROUBLESHOOTING.md](./CONSOLIDATED_TROUBLESHOOTING.md)
   - よく使うコマンドを参照
   - 接続エラー時の対処法

---

## 📝 ドキュメント更新ガイドライン

### 新しい技術実装を追加する場合

1. **適切な統合ドキュメントを選択**:
   - DB関連 → `CONSOLIDATED_SCHEMA.md`
   - 予測関連 → `CONSOLIDATED_FORECAST.md`
   - 引当関連 → `CONSOLIDATED_ALLOCATION.md`
   - トラブル対処 → `CONSOLIDATED_TROUBLESHOOTING.md`
   - フロントエンド → `CONSOLIDATED_FRONTEND.md`
   - その他 → `CONSOLIDATED_MISC.md`

2. **セクションを追加**:
   - 既存の統合ドキュメントに新しいセクションを追加
   - 目次を更新

3. **索引を更新**:
   - 本ファイル (`INDEX.md`) の「統合元」を更新
   - 必要に応じて「目的別ドキュメント参照ガイド」を追加

### 重要な変更の場合

- `CLAUDE.md` の更新も検討してください（AI開発ガイドとして最重要）

---

## 🔗 外部リソース

- **GitHub Repository**: [cybons-lab/lot-management-system](https://github.com/cybons-lab/lot-management-system)
- **API Documentation**: http://localhost:8000/api/docs (開発環境起動時)
- **Frontend**: http://localhost:5173 (開発環境起動時)

---

## 📧 問い合わせ

ドキュメントに不明点がある場合:
1. まず [CONSOLIDATED_TROUBLESHOOTING.md](./CONSOLIDATED_TROUBLESHOOTING.md) を確認
2. 該当する統合ドキュメントの詳細セクションを参照
3. それでも解決しない場合は、開発チームに問い合わせ

---

**最終更新**: 2025-11-25
**ドキュメント整理**: ドキュメントの散在を防ぎ、6つの統合ドキュメントに集約しました。
