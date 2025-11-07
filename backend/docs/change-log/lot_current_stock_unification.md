# ロット現在在庫カラム統一リリースノート

## 概要
- `lot_current_stock` テーブルの現在在庫カラムを `current_quantity`/`last_updated` のみに統一しました。
- 旧カラム (`available_quantity`, `allocated_quantity`, `physical_quantity`, `last_movement_id`) はマイグレーションで削除しています。
- API・スキーマは `current_quantity` と `last_updated` を公開するよう更新しました。

## 影響範囲
- 在庫系 API (`/api/lots`, `/api/admin/stats`, `/api/receipts`, `/api/lots/movements`) が新カラムに依存します。
- サービス層・リポジトリ層は旧カラムへの参照を廃止し、新カラムベースのロジックに統一されました。
- Alembic リビジョン `0acb3d7d0cc5` が追加され、DB 変更とデータ移行を実施します。

## データ移行手順
1. Alembic を最新に適用: `alembic upgrade head`
2. 既存の `lot_current_stock` レコードは以下の優先度で `current_quantity` に移送されます。
   - `available_quantity`
   - `physical_quantity`
   - 上記が存在しない場合は `0`
3. `last_updated` は移行時に `CURRENT_TIMESTAMP` へ更新されます。

## ロールバック
- `alembic downgrade 3c7057758764` を実行すると旧カラムが復元され、`current_quantity` の値が `available_quantity` / `physical_quantity` にコピーされます。
- ダウングレード後、アプリケーションは旧カラムを参照する以前のバージョンに戻す必要があります。

## 注意事項
- API レスポンスから旧カラムは完全に削除されているため、クライアントは `current_quantity` を利用してください。
- `LotResponse` では `current_quantity` / `last_updated` を直接提供します。
