# ドキュメント命名規則・管理ガイドライン

**作成日**: 2025-11-19
**目的**: プロジェクト内のドキュメントの命名規則を統一し、管理方法を標準化する。

---

## 命名規則

### 基本ルール

1. **言語**: ファイル名は**英語（kebab-case）**を基本とする
2. **バージョン**: バージョン情報が必要な場合は `-v{major}.{minor}` を付与
3. **日付**: 日付が必要な場合は末尾に `-YYYY-MM-DD` を付与
4. **拡張子**: Markdown は `.md`、SQL は `.sql`

### ファイル名パターン

| パターン | 形式 | 例 |
|---------|------|-----|
| 基本 | `{topic}.md` | `codebase-structure.md` |
| バージョン付き | `{topic}-v{version}.md` | `api-migration-guide-v2.2.md` |
| 日付付き | `{topic}-{date}.md` | `backend-cleanup-2025-11-18.md` |
| 両方 | `{topic}-v{version}-{date}.md` | `schema-v2.3-2025-11-19.md` |

### NGパターン

| NG | 理由 | 修正例 |
|----|------|--------|
| `API_Reference.md` | 大文字・アンダースコア混在 | `api-reference.md` |
| `設計書v2.1.md` | 日本語ファイル名 | `design-spec-v2.1.md` |
| `refactor_20251110.md` | アンダースコア・日付形式 | `refactor-2025-11-10.md` |
| `CHANGELOG_v2.0.md` | 大文字・アンダースコア | `changelog-v2.0.md` |

### 例外（許容されるパターン）

| ファイル名 | 理由 |
|-----------|------|
| `README.md` | 業界標準 |
| `CLAUDE.md` | プロジェクト固有の標準 |
| `SETUP_GUIDE.md` | ルートレベルの重要ドキュメント |

---

## ディレクトリ構造

### 標準構造

```
docs/
├── README.md                # ドキュメントインデックス
├── DOCUMENT_GUIDELINES.md   # このファイル
│
├── schema/                  # データベーススキーマ
│   ├── er-diagram-v{version}.md
│   ├── base/
│   │   └── lot_management_schema_v{version}.sql
│   └── current/
│       └── current_openapi.json
│
├── architecture/            # アーキテクチャドキュメント
│   ├── codebase-structure.md
│   ├── api-refactor-plan-v{version}.md
│   └── common-type-candidates.md
│
├── api/                     # APIドキュメント
│   ├── api-reference.md
│   └── api-migration-guide-v{version}.md
│
├── design/                  # 設計書（日本語可）
│   ├── {システム名}_概要設計書_v{version}.md
│   └── {トピック}ガイド.md
│
├── troubleshooting/         # トラブルシューティング
│   └── {topic}.md
│
└── archive/                 # アーカイブ
    ├── README.md
    ├── changelog/
    ├── migrations/
    ├── investigations/
    └── design/
```

### カテゴリ説明

| カテゴリ | 用途 | ファイル名言語 |
|---------|------|---------------|
| `schema/` | DBスキーマ、ER図 | 英語 |
| `architecture/` | 技術アーキテクチャ | 英語 |
| `api/` | APIリファレンス | 英語 |
| `design/` | 業務設計書 | 日本語可 |
| `troubleshooting/` | 問題解決ガイド | 英語 |
| `archive/` | 歴史的ドキュメント | 元のまま保持 |

---

## コンテンツ言語

### 原則

| 種類 | 言語 | 理由 |
|------|------|------|
| 技術ドキュメント | 英語 | グローバル標準、ツール連携 |
| 業務設計書 | 日本語 | ステークホルダーとの共有 |
| コメント（コード内） | 英語 | コードとの整合性 |
| UI文言 | 日本語 | ユーザー向け |

### 具体例

| ドキュメント | 言語 | 例 |
|-------------|------|-----|
| API Reference | 英語 | `### GET /api/orders` |
| Architecture docs | 英語 | `## Layered Architecture` |
| 概要設計書 | 日本語 | `## 1. システム概要` |
| ER図ドキュメント | 英語 + 日本語コメント | `-- 倉庫マスタ` |

---

## バージョン管理

### バージョン形式

- **メジャー.マイナー**: `v2.3`, `v3.0`
- **セマンティックバージョニング準拠**を推奨

### バージョン更新ルール

| 変更内容 | バージョン更新 | 例 |
|---------|---------------|-----|
| 破壊的変更（スキーマ変更等） | メジャー | v2.0 → v3.0 |
| 機能追加 | マイナー | v2.2 → v2.3 |
| バグ修正・誤字修正 | 更新なし（コミットで追跡） | - |

### 最新バージョンの明示

各カテゴリで「最新」を明示：

```markdown
## 最新ドキュメント

- **Schema**: v2.3 ([er-diagram-v2.3.md](schema/er-diagram-v2.3.md))
- **API Guide**: v2.2 ([api-migration-guide-v2.2.md](api/api-migration-guide-v2.2.md))
```

---

## アーカイブルール

### アーカイブ対象

- 旧バージョンのドキュメント（2世代以上前）
- 完了した調査・移行記録
- 不採用となった設計案

### アーカイブ方法

1. `docs/archive/{category}/` に移動
2. ファイル名はそのまま保持（履歴追跡のため）
3. archive/README.md に記録を追加

### アーカイブ内のルール

- **削除禁止**: 参照用に保管
- **編集禁止**: 過去の状態を保持
- **参照のみ**: 経緯確認に使用

---

## ドキュメント作成フロー

### 新規作成

1. カテゴリを決定（schema / architecture / api / design / troubleshooting）
2. 命名規則に従ってファイル名を決定
3. 適切なフォルダに配置
4. `docs/README.md` のインデックスを更新
5. 必要に応じて `CLAUDE.md` も更新

### 更新

1. 既存ファイルを直接編集（マイナー更新）
2. バージョン番号更新が必要な場合はファイル名も変更
3. 旧バージョンをarchiveに移動

### アーカイブ

1. `git mv` で archive フォルダに移動
2. `docs/archive/README.md` に記録
3. `docs/README.md` から参照を削除

---

## レビューチェックリスト

新規ドキュメント作成時：

- [ ] ファイル名が命名規則に従っている
- [ ] 適切なフォルダに配置されている
- [ ] `docs/README.md` が更新されている
- [ ] 日本語/英語の使い分けが適切
- [ ] バージョン情報が正しい

ドキュメント更新時：

- [ ] バージョン番号の更新が必要か確認
- [ ] 旧バージョンのアーカイブが必要か確認
- [ ] 関連ドキュメントの参照が最新か確認

---

## 移行計画（既存ドキュメント）

### Phase 1: 即時対応（完了）

- [x] docs/README.md をインデックスとして作成
- [x] 歴史的ドキュメントを archive に移動
- [x] API ドキュメントを api/ に移動
- [x] common_type_candidates を統合

### Phase 2: 段階的対応（推奨）

以下は既存ファイルの命名規則修正候補です。**即時対応は不要**ですが、次回編集時に修正することを推奨：

| 現在のファイル名 | 推奨ファイル名 |
|-----------------|---------------|
| `refactor_20251110.md` | `refactor-2025-11-10.md` |
| `codebase_structure.md` | `codebase-structure.md` |
| `backend_cleanup_2025-11-18.md` | `backend-cleanup-2025-11-18.md` |
| `inventory_items_removal_migration.md` | `inventory-items-removal-migration.md` |

### Phase 3: 長期対応

- design/ フォルダ内の日本語ファイル名は現状維持（ステークホルダー共有のため）
- 自動生成ドキュメント（TypeDoc等）は対象外

---

## 参考: 他のプロジェクト標準との整合性

### コードの命名規則（参考）

| 種類 | バックエンド | フロントエンド |
|------|-------------|---------------|
| ファイル名 | `snake_case.py` | `kebab-case.ts` |
| クラス/型 | PascalCase | PascalCase |
| 関数/変数 | snake_case | camelCase |

### ドキュメントはフロントエンドの kebab-case に準拠

理由：
- Markdownファイルは技術ドキュメントに近い
- GitHubでの表示が自然
- URLで使いやすい

---

**このガイドラインは、プロジェクトの成長に合わせて更新してください。**
