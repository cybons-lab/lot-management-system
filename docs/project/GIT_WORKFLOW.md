# Git ワークフロー

プロジェクトのGit運用ルールを定義します。

## 🚫 禁止事項

### 1. main ブランチへの直接コミット禁止

```bash
# ❌ BAD: mainに直接コミット
git checkout main
git commit -m "fix bug"

# ✅ GOOD: 機能ブランチ経由
git checkout -b fix/bug-description
git commit -m "fix: バグ修正"
# PR作成 → レビュー → マージ
```

**理由:**
- コードレビューの機会を確保
- CI/CDチェックの実行
- 変更履歴の追跡性
- ロールバックの容易性

## 📝 コミットメッセージルール

### 形式（必須）

```
<type>: <日本語タイトル>

<日本語本文（詳細説明）>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**重要:**
- `<type>`: **英語**（feat, fix, docs, refactor等）
- `<タイトル>`: **日本語**
- `<本文>`: **日本語**

### Type一覧

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更
- `style`: コードスタイル修正
- `perf`: パフォーマンス改善

### 例

```
feat: 在庫一覧ページにフィルタ機能を追加

## 変更内容
- 製品名による検索フィルタ
- 倉庫による絞り込み
- 在庫数範囲指定

## 検証
- ✅ 全フィルタが正常に動作
- ✅ パフォーマンステスト通過

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 🔄 ワークフロー

### 1. 機能開発の流れ

```bash
# 1. mainから最新を取得
git checkout main
git pull

# 2. 機能ブランチ作成
git checkout -b feature/inventory-filter

# 3. 開発
# ... コード変更 ...

# 4. バックエンド変更時は型生成（必須）
npm run fe:typegen

# 5. 品質チェック（必須）
npm run quality

# 6. 適切なタイミングでコミット
git add -A
git commit -m "feat: フィルタ機能追加

詳細な変更内容をここに記述

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 7. pushしてPR作成
git push -u origin feature/inventory-filter
gh pr create
```

### 2. コミットのタイミング

**✅ 適切なコミット:**
- 論理的なまとまりごと（1機能、1修正）
- テストが通る状態
- ビルドが成功する状態

**❌ 不適切なコミット:**
- 複数の無関係な変更を1コミット
- ビルドエラーがある状態
- テストが失敗する状態

**例:**
```bash
# ✅ GOOD: 論理的なまとまり
git commit -m "feat: フィルタUIコンポーネント追加"
git commit -m "feat: フィルタAPIエンドポイント実装"
git commit -m "test: フィルタ機能のテスト追加"

# ❌ BAD: 全部まとめて1コミット
git commit -m "WIP: いろいろ変更"
```

## ⚠️ PR作成前チェックリスト

### 必須項目

- [ ] **typegen実行（バックエンド変更時）**: `npm run fe:typegen`
- [ ] **品質チェック通過**: `npm run quality`
- [ ] **スモークテスト通過**: `npm run test:smoke`
- [ ] **コミットメッセージが日本語（type以外）**
- [ ] **Co-Authored-By が含まれる**

### 推奨項目

- [ ] 関連テスト追加
- [ ] ドキュメント更新
- [ ] CHANGELOG.md更新（大きな変更の場合）

## 🔧 実行コマンド

### バックエンド変更時

```bash
# 1. バックエンド変更
# ... コード変更 ...

# 2. 型生成（フロントエンドにOpenAPI型を反映）
npm run fe:typegen

# 3. 品質チェック
npm run be:quality
npm run fe:quality

# 4. コミット
git add -A
git commit -m "feat: API変更

詳細説明

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### フロントエンドのみ変更時

```bash
# 1. フロントエンド変更
# ... コード変更 ...

# 2. 品質チェック
npm run fe:quality

# 3. コミット
git add -A
git commit -m "feat: UI改善

詳細説明

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## 📌 Claudeコミット時の注意

Claudeがコミットする際は、以下を**必ず**含めること：

1. **type**: 英語（feat, fix, docs, refactor等）
2. **タイトル**: 日本語
3. **本文**: 日本語での詳細説明
4. **Co-Authored-By**: 必須

```
type: 日本語タイトル

日本語本文

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**理由:**
- 開発履歴の透明性
- AI支援の明示
- 責任の所在明確化

## 🚀 PR作成

```bash
# PR作成前に最終チェック
npm run quality:full  # 品質チェック + スモークテスト

# PR作成
gh pr create --title "feat: 在庫フィルタ機能追加" --body "..."
```

## 🔒 保護ルール

mainブランチは以下で保護されています：

- PR必須
- レビュー必須
- CI通過必須
- 直接push禁止

これらのルールは`.github/workflows/`とGitHub設定で強制されます。
