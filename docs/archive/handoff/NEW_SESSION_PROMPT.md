# 新規セッション開始用プロンプト

**最終更新:** 2026-01-27
**用途:** 新しいAIチャットセッションを開始する際に、このプロンプトをコピー＆ペーストしてください

---

## プロンプト（ここからコピー）

```
ロット管理システムの開発を続けます。

【重要】コード体系の制約（最優先で理解してください）
このシステムは2つのコード体系のみを使用します：

1. メーカー品番 (supplier_items.maker_part_no)
   - 仕入先が付けている品番
   - 在庫管理の実体はこれ
   - 例: SUZ-BOLT-001, MUR-CABLE-001

2. 得意先品番 (customer_items.customer_part_no)
   - 得意先が注文時に使う品番
   - 例: TOYOTA-A12345

【禁止事項】
- 社内商品コードという概念は存在しません
- productsテーブルは補助的なグルーピング用で、業務識別子ではありません
- products.maker_part_codeを業務コードとして使ってはいけません

【データフロー】
得意先からの注文（得意先品番）
  ↓ customer_items でマッピング
在庫引当（メーカー品番）
  ↓
出荷

詳細はこちら: docs/project/CODE_SYSTEM_DEFINITION.md

【Phase1完了状況】
✅ supplier_items を在庫実体として確立
✅ customer_items でマッピング管理
✅ メーカー品番の重複を排除（各仕入先固有の品番）
✅ フォームの検証エラー修正（SearchableSelectの空文字列問題）

【現在のブランチ】
fix/supplier-product-registration-error

【次のステップ】
- productsテーブルの名前変更を検討中（products_groupingなど）
- UIの動作確認
- 必要に応じてPhase2の計画

【注意】
- SAPほど細かいマッピングは不要です。シンプルに保ってください
- 複雑にしすぎないこと
```

---

## 補足説明

### なぜこのプロンプトが必要か

1. **長いチャット履歴の影響を排除**
   - 初期の試行錯誤や誤った方向性が残っている
   - 新しいセッションで正しい理解からスタート

2. **コード体系の誤解を防ぐ**
   - AIは「商品マスタ」と聞くと社内商品コードを想定しがち
   - 最初に2コード体系を明示することで誤解を防ぐ

3. **現在の完了状況を共有**
   - Phase1で何が完了したかを明確に
   - 次に何をすべきかの方向性を示す

---

## テーブル名変更の検討

### 現状の問題
```
products → 「商品マスタ」と誤解される
         → 社内商品コードがあると勘違いされる
```

### 提案1: products_grouping
```sql
products_grouping (
  id,
  group_code,      -- 旧: maker_part_code
  group_name,      -- 旧: product_name
  ...
)
```
**メリット:** グルーピング用と明確
**デメリット:** 既存コードの大幅修正が必要

### 提案2: product_categories
```sql
product_categories (
  id,
  category_code,
  category_name,
  ...
)
```
**メリット:** カテゴリ分類と理解しやすい
**デメリット:** 「製品」という言葉が残る

### 提案3: item_groups
```sql
item_groups (
  id,
  group_code,
  group_name,
  ...
)
```
**メリット:** 最もニュートラル
**デメリット:** 既存のproductsとの関連が分かりにくい

### 推奨: そのまま products で、コメントを強化
```sql
-- products: Phase2グルーピング用補助テーブル
-- 注意: これは業務識別子ではありません
-- 在庫実体は supplier_items.maker_part_no です
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  maker_part_code VARCHAR(100) NOT NULL, -- 内部ID（業務コードではない）
  product_name VARCHAR(200) NOT NULL,
  ...
);
```

**理由:**
- テーブル名変更は影響範囲が大きい
- 現状、productsはほとんど使われていない
- CODE_SYSTEM_DEFINITION.mdで明確に定義済み
- Phase2実装時に改めて検討すればよい

---

## 次のアクション（新しいセッションで）

1. **UIの動作確認**
   - メーカー品番マスタ新規登録
   - 得意先品番マスタ新規登録
   - ドロップダウンに正しい品番が表示されるか

2. **products テーブルの扱い決定**
   - 名前変更するか、コメント強化で済ませるか
   - Phase2での使い方を明確化

3. **Phase2の計画**
   - productsを使ったグルーピング機能
   - 製品別レポート
   - 関連商品推奨

---

## このドキュメントの使い方

1. 新しいチャットを開始
2. 上記のプロンプトをコピー＆ペースト
3. AIが CODE_SYSTEM_DEFINITION.md を読むのを確認
4. 作業を続行

---

## 関連ドキュメント

- [CODE_SYSTEM_DEFINITION.md](./CODE_SYSTEM_DEFINITION.md) - コード体系の憲法
- [PHASE1_COMPLETION_SUMMARY.md](./PHASE1_COMPLETION_SUMMARY.md) - Phase1完了報告
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体概要
