# API リファレンス (API Reference)

本システムはRESTful APIを提供している。
完全な定義は [openapi.json](../../backend/openapi.json) を参照のこと。

## 1. エンドポイント構成 (Endpoint Structure)
`backend/app/presentation/api/routes` 配下にドメインごとに整理されている。

| タグ/パス | 説明 |
| :--- | :--- |
| **Inventory** | 在庫管理 (`/inventory`) |
| - `/inventory/lots` | ロット検索、詳細取得、ロック/解除 |
| - `/inventory/adjustments` | 在庫調整（棚卸、破損等） |
| - `/inventory/inbound` | 入庫処理 |
| **Allocations** | 引当 (`/allocations`) |
| - `/allocations/calculate` | 引当シミュレーション・実行 |
| - `/allocations/reservations` | 予約の確認、手動確保 |
| **Orders** | 受注 (`/orders`) |
| - `/orders` | 受注登録、検索 |
| **Masters** | マスタ管理 (`/masters`) |
| - `/masters/products` | 製品マスタ |
| - `/masters/customers` | 得意先マスタ |
| - `/masters/suppliers` | 仕入先マスタ |

## 2. 共通仕様 (Common Specifications)
- **認証**: Bearer (JWT)
- **日付フォーマット**: ISO 8601 (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`)
- **エラーレスポンス**:
  ```json
  {
    "detail": "エラーメッセージ"
  }
  ```

## 3. 主要エンドポイント詳細 (Key Endpoints)

### 3.1. ロット一覧検索
`GET /api/v1/inventory/lots`
- **目的**: ロットの検索（製品、倉庫、期限、在庫有無など）
- **パラメータ**: `product_code`, `warehouse_code`, `expiry_from`, `expiry_to`, `with_stock`
- **注意**: `with_stock=true` の場合、有効在庫が0より大きいものを返す。

### 3.2. 引当計算・予約
`POST /api/v1/allocations/calculate`
- **目的**: 受注に対する引当候補の選定と予約作成
- **同時実行性**: 厳密な在庫確保のため、DBレベルのロックまたは楽観ロックが必要（要実装確認）。
- **冪等性**: 同じリクエストIDであれば再計算しない等の制御が望ましい。

## 4. API定義ファイル
- [OpenAPI JSON](../../backend/openapi.json) - ソースコード同期の正本
