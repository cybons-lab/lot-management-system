# ロット在庫の部分ロック機能 (Partial Lot Locking)

## 概要
ロット在庫の全量ではなく、一部の数量を指定してロック（引当不可・出荷停止）にする機能を実装する。
品質検査待ちや、一部破損などの理由で、特定の数量だけを保留したい場合に利用する。

## 要件

### データベース
1. `lots` テーブルに `locked_quantity` カラムを追加する。
   - 型: `Decimal(15, 3)`
   - デフォルト値: `0`
   - 制約: `locked_quantity >= 0`
   - 制約: `allocated_quantity + locked_quantity <= current_quantity` （引当済みとロック分の合計は在庫数を超えない）

### バックエンド (API)
1. **ロックAPI (`POST /api/lots/{lot_id}/lock`) の拡張**
   - リクエストボディに `quantity` (Optional) を追加。
   - `quantity` 指定あり: 指定数量を加算してロック（既存ロック数に追加）。
   - `quantity` 指定なし: 残りの引当可能在庫をすべてロック（既存の挙動に近いが、部分ロックとの整合性を考慮）。
   - ロック理由 (`reason`) も保存。

2. **ロック解除API (`POST /api/lots/{lot_id}/unlock`) の拡張**
   - リクエストボディに `quantity` (Optional) を追加。
   - `quantity` 指定あり: 指定数量分だけロックを解除（減算）。
   - `quantity` 指定なし: ロックを全解除（`locked_quantity = 0`）。

3. **有効在庫計算ロジックの変更**
   - `available_quantity` の計算式を変更。
   - 変更前: `current_quantity - allocated_quantity`
   - 変更後: `current_quantity - allocated_quantity - locked_quantity`
   - ※ `status` が `locked`, `expired` 等の場合は従来通り `0`。

### フロントエンド
1. **ロット詳細画面 / ロックダイアログ**
   - 数量入力フィールドを追加。
   - 「全量をロック」チェックボックス（デフォルトOFF）。
   - 現在のロック数を表示。

## 考慮事項
- **既存の `status = 'locked'` との関係**
  - `status = 'locked'` は「強制全ロック」として維持する。
  - 部分ロックの場合は `status = 'active'` のままで、`locked_quantity > 0` となる状態を許容する。
  - ただし、全量がロックされた場合（`locked_quantity == current_quantity`）に自動的に `status` を `locked` にするかは検討が必要。
  - **決定**: 複雑さを避けるため、`status` はあくまで「状態フラグ」、`locked_quantity` は「数量制御」として分離する。
    - `status = 'locked'`: 数量に関わらず全ロック（緊急停止など）。
    - `locked_quantity > 0`: その数量分だけ引当不可。

## タイムライン
- 見積もり: 3時間
