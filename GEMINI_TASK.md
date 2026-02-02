# Gemini へのタスク - Phase1 根本対策

## 🎯 タスク概要

ロット管理システムのPhase1移行（product_groups → supplier_items）において、**暫定対応（後方互換性維持）**から**根本対策（完全移行）**を実施してください。

---

## 📚 必読ドキュメント

以下のドキュメントを必ず読んでから作業を開始してください:

1. **`docs/project/PHASE1_ROOT_CAUSE_FIX.md`** ← 最重要
   - 現状の問題点
   - 暫定対応の限界
   - 根本対策の方針
   - 実装手順案

2. **`docs/project/CODE_SYSTEM_DEFINITION.md`**
   - Phase1の設計意図
   - コード体系の定義

3. **`CLAUDE.md`**
   - プロジェクト全体の構成
   - コーディング規約

4. **`backend/alembic/versions/products_to_product_groups.py`**
   - 現在のマイグレーションファイル
   - 201行目あたりにビュー定義

---

## 🚨 重要な制約条件

### 本番環境の制約

- **VPN接続の制限:** 何度も切断・接続できない（申請が必要）
- **デプロイは手動:** Git使用時もVPN切断が必要
- **バックエンドアプリ:** サーバーに直接インストール（Dockerなし）
- **PostgreSQL:** サーバーに直接インストール
- **Windows環境:** テスト環境・本番環境ともにWindows Server

### 作業の制約

- **一発で完璧に:** 何度もVPN切断・接続できないため、一度の作業で全てを完了させる必要がある
- **徹底的な事前確認:** 本番デプロイ前にローカルで完全にテストする
- **まとめてコミット:** 細切れのコミットは避け、完成してから1回のコミット

---

## 📋 実施してほしいこと

### Step 1: 徹底的な影響範囲調査（最優先）

以下を**全て**洗い出してください:

#### 1-1. バックエンドの影響範囲

```bash
# product_group_id を参照している全箇所
grep -rn "product_group_id" backend/app/ --include="*.py"

# 結果を以下の形式でリスト化:
# - ファイルパス:行番号
# - コード内容
# - 変更が必要か（Yes/No）
# - 変更内容（必要な場合）
```

**調査対象:**
- モデル定義（`models/`）
- ビュー定義（全てのビューをチェック）
- サービス層（`services/`）
- APIエンドポイント（`routes/`）
- スキーマ定義（`schemas/`）
- テストコード（`tests/`）

#### 1-2. フロントエンドの影響範囲

```bash
# product_group_id を参照している全箇所
grep -rn "product_group_id" frontend/src/ --include="*.ts" --include="*.tsx"

# 結果を以下の形式でリスト化:
# - ファイルパス:行番号
# - コード内容
# - 変更が必要か（Yes/No）
# - 変更内容（必要な場合）
```

**調査対象:**
- 型定義（`types/`）
- APIクライアント（`features/*/api.ts`）
- コンポーネント（`features/*/components/`）
- フォーム（react-hook-form使用箇所）

#### 1-3. データベースの影響範囲

```sql
-- 全てのビュー定義を確認
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';

-- 各ビューの定義を確認して、product_group_id を使っているものをリスト化
SELECT pg_get_viewdef('v_lot_receipt_stock');
SELECT pg_get_viewdef('v_lot_details');
SELECT pg_get_viewdef('v_lot_allocations');
SELECT pg_get_viewdef('v_lot_active_reservations');
-- ... 他のビューも全て確認
```

**調査対象:**
- 全てのビュー定義
- 外部キー制約
- インデックス
- トリガー（存在する場合）

#### 1-4. 調査結果のドキュメント化

`docs/project/PHASE1_IMPACT_ANALYSIS.md` を作成してください。

---

### Step 2: 実装計画の作成

調査結果を元に、`docs/project/PHASE1_IMPLEMENTATION_PLAN.md` を作成してください。

内容:
1. マイグレーション手順
2. コード修正の順序
3. テスト手順
4. デプロイ手順

---

### Step 3: マイグレーションスクリプトの作成

`backend/alembic/versions/phase1_complete_migration.py` を作成してください。

**重要:** 全てのビュー定義を正しくアップデートしてください。

---

### Step 4: コード修正の実施

調査結果と実装計画に基づいて、全てのコードを修正してください。

---

### Step 5: テストの実施

以下のテストを**全て**実施してください:
- バックエンド単体テスト
- フロントエンド型チェック・Lint
- E2Eテスト（手動）
- データベースリセット→マイグレーション→動作確認

---

### Step 6: 成果物の作成

1. **`docs/project/PHASE1_MIGRATION_COMPLETE.md`** - 実施内容の詳細
2. **`backend/alembic/versions/phase1_complete_migration.py`** - マイグレーションスクリプト
3. **`docs/project/ROLLBACK_PROCEDURE.md`** - ロールバック手順

---

## ✅ 完了条件

- [ ] 影響範囲調査が完了し、ドキュメント化されている
- [ ] 実装計画が作成されている
- [ ] マイグレーションスクリプトが完成している
- [ ] 全てのコード修正が完了している
- [ ] ローカル環境で全テストがパスしている
- [ ] データベースリセット→マイグレーション→動作確認が成功している
- [ ] `product_group_id` がコードベースから完全に削除されている
- [ ] 本番デプロイ手順書が作成されている
- [ ] ロールバック手順書が作成されている
- [ ] 全ての変更が1回のコミットにまとまっている

---

**重要:** 一発で完璧に仕上げる必要があります。不安がある場合は、作業を進める前に確認してください。

---

**作成日:** 2026-02-02
**ブランチ:** `fix/migration-boolean-comparison-error`
