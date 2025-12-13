---
description: API例外ハンドリングの監査 - 呼び出し先の例外が適切に捕捉されているかチェック
---

# API例外ハンドリング監査

## 目的
APIエンドポイント（router）が、呼び出しているサービス層の関数で発生する可能性のある**すべての例外**を適切に捕捉し、正しいHTTPステータスコードを返しているかを確認する。

## 手順

### 1. 対象routerファイルの確認
対象のrouterファイル（例: `backend/app/presentation/api/routes/*/`）を開く。

### 2. 各エンドポイントの分析
各エンドポイント関数について以下を確認：

1. **呼び出しているサービス関数を特定**
   - `actions.*`, `fefo.*` など、サービス層の関数呼び出しをリストアップ

2. **サービス関数の例外を確認**
   - 各サービス関数のソースコードを開く
   - `raise` 文で発生させている例外をすべてリストアップ
   - 例外クラスの定義も確認（`schemas.py` や `errors.py`）

3. **router側の例外捕捉を確認**
   - `except` ブロックでリストアップした例外がすべて捕捉されているか
   - 適切なHTTPステータスコードを返しているか：
     - `400 Bad Request`: バリデーションエラー
     - `404 Not Found`: リソースが見つからない
     - `409 Conflict`: 在庫不足、競合状態
     - `500 Internal Server Error`: 未捕捉の例外（避けるべき）

### 3. 問題の報告
未捕捉の例外があれば、以下の形式で報告：

```
## 未捕捉例外レポート

### エンドポイント: POST /allocations/commit
- **呼び出し関数**: `actions.commit_fefo_allocation`
- **未捕捉例外**: `InsufficientStockError`
- **現在の動作**: 500 Internal Server Error
- **推奨修正**: 409 Conflict を返す
```

### 4. 修正の実施
報告した問題について：
1. 該当routerファイルに例外インポートを追加
2. `except` ブロックに適切なハンドラを追加
3. ruff formatを実行
4. OpenAPIスキーマを再生成（必要に応じて）

## 対象となる主なファイル
- `backend/app/presentation/api/routes/allocations/allocations_router.py`
- `backend/app/presentation/api/routes/orders/orders_router.py`
- `backend/app/presentation/api/routes/lots/lots_router.py`

## 関連する例外クラス定義
- `backend/app/application/services/allocations/schemas.py`
- `backend/app/domain/errors.py`
