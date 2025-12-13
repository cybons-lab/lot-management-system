# アプリ層 あら探しレポート

**作成日**: 2025-12-14
**対象**: lot-management-system v2.3+ (Backend/Frontend)
**作成者**: Antigravity

---

## 概要

本レポートは、P0/P1/P2のスキーマ整備完了を受け、アプリケーション層（Service, Domain, Frontend）に残存する弱点・不整合を厳しく監査した結果である。
スキーマがきれいになっても、コードがそれを正しく扱えていなければ意味がない。特に「Plan C（責務分離）」の遵守状況と、データの整合性維持に焦点を当てた。

---

## 🔴 優先度 P1: 近い将来の事故 (High Priority)

### 1. 受注インポートにおけるドメイン境界違反 (Plan C 違反)

**タイトル**: `OrderImportService` が `customer_items` を無視して `products` を直接参照している
**優先度**: P1
**影響範囲**: `backend/app/application/services/orders/order_import_service.py`

**症状**:
得意先からの受注データ取込時、製品特定ロジックが「得意先品番」ではなく「メーカー品番」を前提としている。
得意先が独自の品番（例: "CUST-001"）を使用している場合、取込エラーになるか、最悪の場合誤った製品（メーカー品番がたまたま一致するもの）に紐づくリスクがある。

**再現/条件**:
1. `customer_items` に `external_product_code="CUST-001"`, `product_id=100` を定義。
2. `products` の `maker_part_code="PROD-100"` とする。
3. 受注CSVで `product_code="CUST-001"` を指定してインポートを実行。
4. **結果**: `products` テーブルを `maker_part_code="CUST-001"` で検索し、見つからずエラーになる（あるいは誤爆する）。

**原因**:
`OrderImportService.import_order_lines` (L99) で `Product` リポジトリを直接使用している。
```python
# 現在の実装 (Plan C違反)
product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
```
本来は `customer_items` テーブルを経由して変換すべきである（SCHEMA_GUIDE.md "受注/出荷処理で品番変換が必要な場合 → customer_items を使用" に違反）。

**修正案**:
1. 入力 `product_code` を `external_product_code` とみなす。
2. `customer_items` を `(customer_id, external_product_code)` で検索。
3. ヒットすればその `product_id` を使用。
4. ヒットしなければ（オプションで）`products.maker_part_code` を検索（フォールバック）。

---

## 🟠 優先度 P2: 負債・運用リスク (Medium Priority)

### 2. 引当情報の二重管理と不整合リスク

**タイトル**: `allocations` と `lot_reservations` の二重書き込みによる整合性リスク
**優先度**: P2
**影響範囲**: `backend/app/application/services/allocations/commit.py`, `manual.py`, `confirm.py`

**症状**:
引当作成時に `Allocation` (受注側) と `LotReservation` (在庫側) の両方のレコードを作成している。
片方のみが成功し、片方が失敗するケース（コード上のバグや手動データ修正）が発生すると、
「受注画面では引当済みなのに在庫が減っていない」または「在庫は確保されているのにどの受注かわからない」状態になる。

**再現/条件**:
現在は同一トランザクション内で `db.add` しているので即時の不整合は起きない。
しかし、将来的に片方のテーブルのみを操作するバッチ処理や修正パッチが適用された場合、容易にズレる。
例: `LotReservation` を直接削除しても `Allocation` が残る（逆も然り）。

**原因**:
過渡期設計として両テーブルを維持しているが、Single Source of Truth が曖昧。
`v_lot_allocations` は `lot_reservations` を見ているが、`v_order_line_details` や APIレスポンスの一部は `allocations` を見ている可能性がある。

**修正案**:
- **理想案**: `allocations` テーブルを廃止し、`LotReservation` に一本化する。
- **現実案**: `AllocationRepository` 内で必ず両方を更新することを強制するラッパーを作成し、Service層での個別操作を禁止する。また、定期的な整合性チェックバッチ（Reconciler）を導入する。

### 3. フロントエンドのグローバルエラーハンドリング不足

**タイトル**: HTTP 409/422 エラーがユーザーに適切にフィードバックされない可能性
**優先度**: P2
**影響範囲**: `frontend/src/shared/api/http-client.ts`, 各FeatureのUIコンポーネント

**症状**:
バックエンドが検証エラー (422) や競合エラー (409 "Already Confirmed") を返しても、フロントエンド画面で「エラーが発生しました」等の汎用メッセージが出るか、あるいは何も起きない（コンソールエラーのみ）。
特に `OrderService` 等は例外をそのままスローしており、呼び出し元（UIコンポーネント）が `try-catch` して Toast を出していない箇所があれば、ユーザーは操作が無視されたと感じる。

**原因**:
`http-client.ts` はエラーを正規化して投げるが、グローバルな Toast 表示機構（Interceptorでの自動表示など）がない。
各画面の実装依存になっている。

**修正案**:
`http-client.ts` の `afterResponse` または `beforeError` フックに、特定のステータスコード（4xx系、5xx系）の場合に自動的に Toast を表示するロジックを追加する（ただし、検証エラーなど画面内で個別に表示したい場合を除くフラグが必要）。

---

## 🟡 優先度 P3: 将来の改善 (Low Priority)

### 4. `product_mappings` の存在意義の希薄化

**タイトル**: 調達機能未実装のため `product_mappings` がDead Code化している
**優先度**: P3
**影響範囲**: `backend/app/application/services/master_import`, `backend/app/infrastructure/persistence/models/masters_models.py`

**症状**:
`product_mappings` テーブルが存在し、マスタインポート機能もあるが、実業務（発注・調達）で使用されていない。
開発者が「品番変換にはこっちを使うのか？」と誤解するノイズになっている（ADR-003で定義済みだが、コードがある限り誤用リスクはある）。

**修正案**:
調達機能開発開始まで `product_mappings` 関連のコード（Router, Service）をコメントアウトするか、`@deprecated` 指定を強化する。

### 5. フロントエンド型定義の `lot_reference` 残存

**タイトル**: `allocations` テーブル由来の `lot_reference` がAPIレスポンスに残っている
**優先度**: P3
**影響範囲**: `frontend/src/types/generated.ts` (API Schema)

**症状**:
バックエンドは `lot_id` FK に移行したが、互換性維持のため `lot_reference` (String) も返却している。
フロントエンドでこれを一意識別子として使うと、将来的に不具合の原因になる（ロット番号は変更される可能性があるため）。

**修正案**:
フロントエンドコードで `lot_reference` の使用を禁止し（lintルール等）、`lot_id` と `lot_number` のみを使用するようにリファクタリングする。

---

## 上位5件のまとめと推奨実行順

1.  **[P1] OrderImportService の修正**
    -   **理由**: 得意先品番が使えないのは業務要件満たさない可能性大。かつデータ不整合の元。
    -   **アクション**: `customer_items` を検索するロジックに変更。

2.  **[P2] LotReservation/Allocations リコンサイラー作成**
    -   **理由**: 二重管理は人間が必ずミスをする。ズレ検知用スクリプトを用意する。
    -   **アクション**: `check_integrity.py` のようなスクリプトを作成し、CIやCronで回す。

3.  **[P2] フロントエンドのエラーハンドリング強化**
    -   **理由**: UIの品質直結。409 (競合) のハンドリングは必須。
    -   **アクション**: `http-client.ts` にToast表示を追加実験。

4.  **[P3] 不要な product_mappings コードの封印**
    -   **理由**: 誤用防止。
    -   **アクション**: コードコメントで警告を追加。

5.  **[P3] フロントエンド型定義のクリーンアップ**
    -   **理由**: 技術的負債の解消。
    -   **アクション**: 次回リファクタリング時に実施。
