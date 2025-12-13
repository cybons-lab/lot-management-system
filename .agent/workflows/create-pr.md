---
description: ブランチ作成からPRまでを完了する
---

# Feature Branch → PR ワークフロー

作業が完了したブランチをPRとして提出する手順。

## 手順

### 0. 例外ハンドリング監査（自動）

変更されたrouterファイルがある場合、以下を確認：
1. 各エンドポイントが呼び出すサービス関数を特定
2. サービス関数が発生させる例外をすべてリストアップ
3. router側で未捕捉の例外がないか確認
4. 未捕捉があれば適切なHTTPステータスで返すよう修正

詳細は `/exception-audit` ワークフロー参照。

### 1. コードフォーマット（CIエラー防止）
// turbo

```bash
cd backend && uv run ruff format app/ tests/
```

### 2. 変更をステージング

```bash
git add -A
```

### 3. コミット

コンベンショナルコミット形式を使用:

```bash
git commit -m "feat|fix|docs|refactor|test: 変更の概要

- 詳細な変更点1
- 詳細な変更点2

Refs: 関連ドキュメントやイシュー"
```

### 4. リモートにプッシュ
// turbo

```bash
git push -u origin <ブランチ名>
```

### 5. PRを作成
// turbo

```bash
gh pr create --title "<タイトル>" --body "<PR説明>" --base main
```

**PR説明に含める内容**:
- 概要（何をしたか）
- 変更内容（箇条書き）
- 注意点/破壊的変更
- テスト結果

---

## 例

```bash
# ステージング
git add -A

# コミット
git commit -m "feat: Add lot_reservations table (Step1)

- Add lot_reservations table with Alembic migration
- Add LotReservation model
- Add LotReservationService

Refs: docs/architecture/decoupling-migration-plan.md"

# プッシュ
git push -u origin feature/step1-lot-reservations

# PR作成
gh pr create --title "feat: Add lot_reservations table (Step1)" \
  --body "## 概要
  
  Step1 の実装
  
  ## 変更内容
  - lot_reservations テーブル新設
  - LotReservation モデル追加
  
  ## テスト結果
  - 新規: 20 passed
  - 既存: 296 passed" \
  --base main
```
