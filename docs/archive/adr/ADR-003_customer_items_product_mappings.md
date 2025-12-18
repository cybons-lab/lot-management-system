# ADR-003: customer_items / product_mappings の責務分離

**ステータス**: 採用（Accepted）  
**作成日**: 2025-12-14  
**決定日**: 2025-12-14  
**作成者**: AI Assistant  
**レビュアー**: kazuk

---

## 背景・課題

### 現状の問題

1. **テーブル役割の曖昧さ**
   - `customer_items` と `product_mappings` が類似したカラム構成を持つ
   - どちらを使用すべきか不明確で、開発者が混乱する可能性

2. **データ重複リスク**
   - 同じ「得意先+品番→製品」のマッピング情報が両テーブルに登録される可能性
   - メンテナンスコストの増加

3. **依存関係の非対称性**
   - `customer_items` には `jiku_mappings`, `delivery_settings` が紐づく
   - `product_mappings` には関連テーブルがない

### 発見の経緯

P0/P1スキーマ修正の際に `schema_review_report.md` で中程度の問題として特定。P2完了後のP3タスクとして設計分析を実施。

---

## 決定

### 採用方針: 役割明確化（コード変更なし）

両テーブルを維持しつつ、**責務境界を明文化**することで問題を解決する。

| テーブル | 責務 | ドメイン |
|----------|------|----------|
| `customer_items` | 得意先別品番設定 + 出荷設定 | 受注・出荷 |
| `product_mappings` | 4者マッピング（調達用） | 調達・発注 |

### 具体的な対応

1. **ドキュメント整備**
   - 本ADRの作成・承認
   - SCHEMA_GUIDE.md への役割記載

2. **コード内コメント追加**
   - モデルクラスのdocstringに使用ドメインを明記

3. **使用状況モニタリング**
   - `product_mappings` の実使用状況を監視
   - 未使用が確認されれば将来的に deprecation を検討

---

## 代替案

### 案A: customer_items に統合

| 項目 | 評価 |
|------|------|
| **概要** | product_mappings を廃止し、customer_items に統合 |
| **メリット** | テーブル数削減、保守コスト低減 |
| **デメリット** | 約10ファイルの修正、テスト範囲大 |
| **却下理由** | 現時点で product_mappings はほぼ未使用であり、急いで統合するリスクが見合わない |

### 案B: product_mappings を正に

| 項目 | 評価 |
|------|------|
| **概要** | product_mappings を主テーブルとし、customer_items を外部I/F用途に限定 |
| **メリット** | BIGSERIAL PKで参照が容易、supplier_id が NOT NULL で整合性向上 |
| **デメリット** | ビュー修正、jiku_mappings/delivery_settings の移行が複雑（約27ファイル影響） |
| **却下理由** | 変更影響が大きく、現行機能に破壊的影響を与えるリスク |

---

## 影響範囲

### 今回の変更による影響

| カテゴリ | 変更 |
|----------|------|
| テーブル構造 | なし |
| ビュー | なし |
| API | なし |
| コード | ドキュメントコメントのみ |
| フロントエンド | なし |

### 関連テーブル

| テーブル | 役割 | 変更 |
|----------|------|------|
| `customer_items` | 得意先品番マッピング | なし |
| `customer_item_jiku_mappings` | 次区マッピング | なし |
| `customer_item_delivery_settings` | 納入先別設定 | なし |
| `product_mappings` | 4者マッピング | なし |
| `product_uom_conversions` | 単位換算 | なし |
| `product_suppliers` | 製品-仕入先関係 | なし |

---

## ロールバック戦略

本ADRは**ドキュメント変更のみ**であるため、ロールバックは以下で対応可能：

1. ADRファイルをRevert
2. SCHEMA_GUIDE.md の該当セクションを削除
3. モデルdocstringコメントを元に戻す

**データベースマイグレーション不要**

---

## 将来の検討事項

1. **product_mappings 活用の判断**
   - 調達機能が実装される場合: 仕入先別単価/リードタイムを product_mappings に追加
   - 活用されない場合: 段階的にテーブルを廃止

2. **customer_items の PK 変更検討**
   - 複合PKから BIGSERIAL への変更は大規模リファクタが必要
   - 必要性が高まった場合のみ実施

3. **統合判断の再評価**
   - 6ヶ月後に使用状況を再評価
   - 両テーブルの使用パターンに基づいて統合判断を再検討

---

## 参考資料

- [schema_review_report.md](schema_review_report.md) - 問題の初回特定
- [P3_customer_items_product_mappings_analysis.md](P3_customer_items_product_mappings_analysis.md) - 詳細分析
- [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md) - 責務境界ガイド
