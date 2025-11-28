# ロギング戦略ドキュメント

**最終更新日:** 2025-11-28
**バージョン:** v2.0.0+logging
**ステータス:** 実装完了

---

## 目次

1. [概要](#概要)
2. [実装フェーズ](#実装フェーズ)
3. [構成要素](#構成要素)
4. [使用方法](#使用方法)
5. [ログ出力例](#ログ出力例)
6. [運用ガイド](#運用ガイド)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 背景

従来のロギング実装には以下の課題がありました：

- **構造化されていないログ**: テキストベースで機械可読性が低い
- **コンテキスト情報の不足**: リクエストIDやユーザー情報が欠如
- **エラートレーサビリティの低さ**: エラー発生時の詳細情報が不足
- **監査証跡の不備**: 重要な操作の記録が不完全
- **パフォーマンス監視の欠如**: レスポンスタイムなどのメトリクスが未収集

### 改善目標

1. **構造化ロギング**: JSON形式での一貫したログ出力
2. **自動ロギング**: ミドルウェアによる全リクエスト/レスポンスの自動記録
3. **エラー追跡性向上**: エラーコード体系と詳細なコンテキスト情報
4. **監査証跡の確立**: DBテーブルによる重要操作の記録
5. **パフォーマンス可視化**: エンドポイントごとのメトリクス収集

### 実装成果

✅ **6つのフェーズすべて完了**
- Phase 1: 構造化ロギング基盤
- Phase 2: リクエストログミドルウェア
- Phase 3: エラーログ強化
- Phase 4: 監査ログ（DB）
- Phase 5: ログローテーション設定
- Phase 6: パフォーマンスメトリクス収集

---

## 実装フェーズ

### Phase 1: 構造化ロギング基盤

**目的:** JSON形式での一貫したログ出力

**実装内容:**

1. **依存関係の追加**
   ```toml
   # pyproject.toml
   dependencies = [
       "python-json-logger>=2.0.7",
   ]
   ```

2. **カスタムフォーマッタの実装**
   - `CustomJsonFormatter`: JSON形式でのログ出力
   - `ColoredConsoleFormatter`: 開発環境用カラー付き出力

3. **コンテキスト変数の管理**
   ```python
   # app/core/logging.py
   request_id_var: ContextVar[str | None]
   user_id_var: ContextVar[int | None]
   username_var: ContextVar[str | None]
   ```

4. **センシティブ情報のマスキング**
   - password, token, secret, api_key, authorization, cookie

5. **ログローテーション設定**
   - ファイルサイズベース（デフォルト: 100MB）
   - バックアップ数管理（デフォルト: 10ファイル）
   - 保持期間設定（デフォルト: 30日）

**関連ファイル:**
- `backend/app/core/logging.py` (改修)
- `backend/app/core/config.py` (ログ設定追加)
- `backend/pyproject.toml` (依存関係追加)

---

### Phase 2: リクエストログミドルウェア

**目的:** すべてのAPIリクエスト/レスポンスを自動記録

**実装内容:**

1. **RequestLoggingMiddleware**
   - リクエスト開始時のログ
     - メソッド、パス、クエリパラメータ、ヘッダー
     - リクエストボディ（センシティブ情報はマスク）
   - レスポンス完了時のログ
     - ステータスコード、レスポンスタイム
     - レスポンスヘッダー

2. **コンテキスト管理**
   - `contextvars`を使用したリクエストIDの自動付加
   - ユーザー認証情報の自動付加

3. **エラー時の詳細ログ**
   - スタックトレース
   - リクエストコンテキスト全体

**ミドルウェア登録順序:**
```python
# 実行順: CORS → Metrics → RequestLogging → RequestID
app.add_middleware(CORSMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)
```

**関連ファイル:**
- `backend/app/middleware/logging.py` (新規)
- `backend/app/middleware/request_id.py` (改善)
- `backend/app/main.py` (ミドルウェア登録)

---

### Phase 3: エラーログ強化

**目的:** エラー発生時の詳細情報を漏れなく記録

**実装内容:**

1. **エラーハンドラの改修**
   - `domain_exception_handler`: エラーコード、詳細情報、クエリパラメータ
   - `http_exception_handler`: 構造化ログ記録
   - `validation_exception_handler`: バリデーションエラー詳細
   - `generic_exception_handler`: 完全なコンテキスト（ヘッダー、ボディ、トレースバック）

2. **エラーコード体系**
   ```python
   # 例
   ORDER_NOT_FOUND        # 受注不在エラー
   ORDER_LINE_NOT_FOUND   # 受注明細不在エラー
   INVALID_ORDER_STATUS   # 不正な受注ステータス
   DUPLICATE_ORDER        # 重複受注エラー
   VALIDATION_ERROR       # バリデーションエラー
   INTERNAL_SERVER_ERROR  # サーバー内部エラー
   ```

3. **DomainErrorの拡張**
   ```python
   class DomainError(Exception):
       def __init__(
           self,
           message: str,
           code: str | None = None,
           details: dict | None = None,  # 新規追加
       ):
           self.message = message
           self.code = code or self.default_code
           self.details = details or {}
   ```

4. **Problem+JSON形式のレスポンス**
   ```json
   {
       "type": "about:blank",
       "title": "OrderNotFoundError",
       "status": 404,
       "detail": "Order not found: 123",
       "instance": "/api/orders/123",
       "error_code": "ORDER_NOT_FOUND",
       "details": {
           "order_id": 123
       }
   }
   ```

**関連ファイル:**
- `backend/app/core/errors.py` (全エラーハンドラ改善)
- `backend/app/domain/errors.py` (DomainError基底クラス拡張)
- `backend/app/domain/order/exceptions.py` (各例外改善)

---

### Phase 4: 監査ログ（DB）

**目的:** 重要な操作をDBに記録（コンプライアンス対応）

**実装内容:**

1. **OperationLogService**
   - CRUD操作の記録
   - ログイン/ログアウトの記録
   - データエクスポートの記録

2. **記録内容**
   ```python
   {
       "user_id": 1,                    # 操作ユーザー
       "operation_type": "create",      # 操作タイプ
       "target_table": "orders",        # 対象テーブル
       "target_id": 123,                # 対象レコードID
       "changes": {                     # 変更内容
           "old_values": {...},
           "new_values": {...}
       },
       "ip_address": "192.168.1.100",   # IPアドレス
       "created_at": "2025-11-28T12:34:56Z"
   }
   ```

3. **デコレーターパターン**
   ```python
   from app.decorators.logging import log_operation

   @log_operation("create", "orders", lambda result: result.id)
   def create_order(db: Session, order_data: OrderCreate):
       # ビジネスロジック
       return order
   ```

4. **DBテーブル**
   - `operation_logs`: 操作ログ
   - `master_change_logs`: マスタ変更履歴（既存）

**関連ファイル:**
- `backend/app/services/common/operation_log_service.py` (新規)
- `backend/app/decorators/logging.py` (新規)
- `backend/app/decorators/__init__.py` (新規)

---

### Phase 5: ログローテーションとファイル出力設定

**目的:** 本番環境でのログ管理

**実装内容:**

1. **環境変数設定**
   ```env
   # ログレベル（DEBUG, INFO, WARNING, ERROR, CRITICAL）
   LOG_LEVEL=INFO

   # ファイル出力を有効にするか
   LOG_FILE_ENABLED=true

   # JSON形式でログ出力するか
   # 開発環境: false（カラー付きテキスト）
   # 本番環境: true（JSON形式）
   LOG_JSON_FORMAT=false

   # ログファイルのローテーションサイズ（バイト）
   LOG_ROTATION_SIZE=104857600  # 100MB

   # ログファイルの保持期間（日数）
   LOG_RETENTION_DAYS=30

   # ログファイルのバックアップ数
   LOG_BACKUP_COUNT=10
   ```

2. **ログファイル構成**
   ```
   backend/logs/
   ├── app.log         # 全レベルのログ
   ├── app.log.1       # ローテーション済み
   ├── app.log.2
   ├── error.log       # ERROR以上のみ
   ├── error.log.1
   └── error.log.2
   ```

3. **環境別設定**
   - **Development**: カラー付きテキスト、コンソール出力、ファイル出力
   - **Production**: JSON形式、ファイル出力のみ

**関連ファイル:**
- `backend/.env.example` (ログ設定追加)
- `backend/.gitignore` (logs/ディレクトリ除外済み)

---

### Phase 6: パフォーマンスメトリクス収集

**目的:** システムパフォーマンスの可視化

**実装内容:**

1. **MetricsMiddleware**
   - 全リクエストのレスポンスタイムを自動記録
   - エンドポイントごとのメトリクス集計

2. **収集メトリクス**
   - リクエスト数
   - エラー数/エラー率
   - レスポンスタイム（平均、中央値、p95, p99）
   - ステータスコード分布
   - 最終リクエスト時刻

3. **MetricsCollector（シングルトン）**
   - スレッドセーフなメトリクス収集
   - メモリ効率的な設計（最新1000件のみ保持）

4. **APIエンドポイント**
   - `GET /api/admin/metrics`: メトリクス取得
   - `POST /api/admin/metrics/reset`: メトリクスリセット（開発環境のみ）

**メトリクスレスポンス例:**
```json
{
    "total_requests": 1500,
    "total_errors": 25,
    "error_rate": 0.0167,
    "endpoints_count": 15,
    "endpoints": [
        {
            "endpoint": "GET /api/orders",
            "request_count": 450,
            "error_count": 5,
            "error_rate": 0.0111,
            "avg_duration_ms": 42.5,
            "median_duration_ms": 38.2,
            "p95_duration_ms": 85.3,
            "p99_duration_ms": 120.1,
            "status_codes": {
                "200": 445,
                "404": 5
            },
            "last_request_time": "2025-11-28T12:34:56.789Z"
        }
    ]
}
```

**関連ファイル:**
- `backend/app/middleware/metrics.py` (新規)
- `backend/app/api/routes/admin/admin_router.py` (エンドポイント追加)
- `backend/app/main.py` (ミドルウェア登録)

---

## 構成要素

### アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                         FastAPI App                          │
├─────────────────────────────────────────────────────────────┤
│  Middleware Stack (実行順: 下から上)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ RequestIdMiddleware        # リクエストID生成         │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ RequestLoggingMiddleware   # リクエスト/レスポンス    │  │
│  │   - set_request_context()  # コンテキスト設定        │  │
│  │   - clear_request_context()                          │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ MetricsMiddleware          # メトリクス収集          │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ CORSMiddleware             # CORS処理                │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Exception Handlers                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ domain_exception_handler    # ドメイン例外          │  │
│  │ http_exception_handler      # HTTP例外               │  │
│  │ validation_exception_handler # バリデーションエラー  │  │
│  │ generic_exception_handler   # 予期しない例外         │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Logging Infrastructure                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ CustomJsonFormatter        # JSON形式フォーマッタ    │  │
│  │ ColoredConsoleFormatter    # カラー付きフォーマッタ  │  │
│  │ RotatingFileHandler        # ログローテーション      │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Audit Logging                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ OperationLogService        # 監査ログサービス        │  │
│  │ @log_operation decorator   # 自動ログ記録           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  Console │        │   Files  │        │ Database │
    │  Output  │        │ app.log  │        │operation_│
    │          │        │error.log │        │  logs    │
    └──────────┘        └──────────┘        └──────────┘
```

### データフロー

```
1. Request arrives
   ↓
2. RequestIdMiddleware: Generate/extract request_id
   ↓
3. RequestLoggingMiddleware:
   - set_request_context(request_id, user_id, username)
   - Log request start
   ↓
4. MetricsMiddleware: Start timer
   ↓
5. Business Logic / Error occurs
   ↓
6. Exception Handler (if error):
   - Log error with full context
   - Return Problem+JSON response
   ↓
7. MetricsMiddleware: Record metrics
   ↓
8. RequestLoggingMiddleware:
   - Log request completion
   - clear_request_context()
   ↓
9. Response returned
```

---

## 使用方法

### 開発環境セットアップ

```bash
# 1. バックエンドディレクトリに移動
cd backend

# 2. 環境変数設定
cp .env.example .env

# 3. .envを編集（開発環境設定）
cat > .env << EOF
ENVIRONMENT=development
LOG_LEVEL=INFO
LOG_FILE_ENABLED=true
LOG_JSON_FORMAT=false  # カラー付きテキスト
EOF

# 4. 依存関係インストール
pip install -e .

# 5. サーバー起動
uvicorn app.main:app --reload
```

### 本番環境セットアップ

```bash
# .env設定（本番環境）
cat > .env << EOF
ENVIRONMENT=production
LOG_LEVEL=WARNING
LOG_FILE_ENABLED=true
LOG_JSON_FORMAT=true  # JSON形式
LOG_ROTATION_SIZE=104857600  # 100MB
LOG_RETENTION_DAYS=30
LOG_BACKUP_COUNT=10
EOF

# サーバー起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### ロガーの使用方法

```python
import logging

# ロガー取得
logger = logging.getLogger(__name__)

# 基本的なログ出力
logger.info("Order created successfully")
logger.warning("Stock level is low")
logger.error("Failed to process payment")

# 追加情報付きログ
logger.info(
    "Order processed",
    extra={
        "order_id": 123,
        "customer_id": 456,
        "total_amount": 10000,
    },
)

# エラーログ（スタックトレース付き）
try:
    process_order()
except Exception as e:
    logger.error(
        "Order processing failed",
        extra={"order_id": 123},
        exc_info=True,
    )
```

### 監査ログの記録

```python
from app.services.common.operation_log_service import OperationLogService
from app.core.database import get_db

# サービス初期化
log_service = OperationLogService(db)

# 作成操作の記録
log_service.log_create(
    target_table="orders",
    target_id=order.id,
    user_id=current_user.id,
    data={"order_no": "ORD-001", "total": 10000},
    ip_address=request.client.host,
)

# 更新操作の記録
log_service.log_update(
    target_table="orders",
    target_id=order.id,
    user_id=current_user.id,
    old_values={"status": "draft"},
    new_values={"status": "confirmed"},
    ip_address=request.client.host,
)

# ログイン記録
log_service.log_login(
    user_id=user.id,
    ip_address=request.client.host,
    success=True,
)
```

### デコレーターの使用

```python
from app.decorators.logging import log_operation

@log_operation("create", "orders", lambda result: result.id)
def create_order(
    db: Session,
    request: Request,  # 必須（IPアドレス取得のため）
    order_data: OrderCreate,
):
    order = Order(**order_data.dict())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
```

### メトリクスの確認

```bash
# メトリクス取得
curl http://localhost:8000/api/admin/metrics

# メトリクスリセット（開発環境のみ）
curl -X POST http://localhost:8000/api/admin/metrics/reset
```

---

## ログ出力例

### 開発環境（カラー付きテキスト）

```
INFO     app.main                        🚀 ロット管理システム v2.0.0 を起動しています...
INFO     app.main                        📦 環境: development
INFO     app.main                        💾 データベース: postgresql://...
INFO     app.core.logging                Logging system initialized
INFO     app.middleware.logging          [req=a1b2c3d4 user=admin] Request started
INFO     app.services.order_service      [req=a1b2c3d4 user=admin] Order created successfully
INFO     app.middleware.logging          [req=a1b2c3d4 user=admin] Request completed
WARNING  app.domain.order.exceptions     [req=e5f6g7h8 user=admin] Domain exception: OrderNotFoundError
ERROR    app.core.errors                 [req=i9j0k1l2] Unhandled exception: ValueError
```

### 本番環境（JSON形式）

**通常のリクエストログ:**
```json
{
  "timestamp": "2025-11-28T12:34:56.789123Z",
  "level": "INFO",
  "logger": "app.middleware.logging",
  "message": "Request started",
  "request_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "user_id": 1,
  "username": "admin",
  "environment": "production",
  "file": "/app/app/middleware/logging.py:95",
  "function": "dispatch",
  "method": "POST",
  "path": "/api/orders",
  "query_params": {},
  "headers": {
    "content-type": "application/json",
    "authorization": "***MASKED***"
  },
  "client_ip": "192.168.1.100",
  "body": {
    "order_no": "ORD-001",
    "customer_id": 123
  }
}
```

**エラーログ:**
```json
{
  "timestamp": "2025-11-28T12:35:10.123456Z",
  "level": "ERROR",
  "logger": "app.core.errors",
  "message": "Unhandled exception: ValueError",
  "request_id": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "user_id": 1,
  "username": "admin",
  "environment": "production",
  "file": "/app/app/core/errors.py:232",
  "function": "generic_exception_handler",
  "exception_type": "ValueError",
  "exception_message": "Invalid order status",
  "path": "/api/orders/123",
  "method": "PATCH",
  "query_params": {},
  "headers": {...},
  "request_body": "{\"status\": \"invalid_status\"}",
  "traceback": "Traceback (most recent call last):\n  File ..."
}
```

---

## 運用ガイド

### ログファイル管理

#### ログファイルの確認

```bash
# ログディレクトリ確認
ls -lh backend/logs/

# 最新のログを表示
tail -f backend/logs/app.log

# エラーログのみ表示
tail -f backend/logs/error.log

# JSONログを読みやすく表示（jqを使用）
tail -f backend/logs/app.log | jq '.'
```

#### ログファイルのローテーション確認

```bash
# ローテーション済みファイルの確認
ls -lh backend/logs/app.log*

# 出力例:
# -rw-r--r-- 1 user user  50M Nov 28 12:00 app.log
# -rw-r--r-- 1 user user 100M Nov 27 12:00 app.log.1
# -rw-r--r-- 1 user user 100M Nov 26 12:00 app.log.2
```

#### 古いログの削除

ログファイルは自動的にローテーションされますが、手動削除も可能です：

```bash
# 30日以上前のログを削除
find backend/logs/ -name "*.log.*" -mtime +30 -delete

# 特定のログファイルを削除
rm backend/logs/app.log.10
```

### メトリクス監視

#### 定期的なメトリクス確認

```bash
# cron設定例（毎時メトリクスを記録）
0 * * * * curl http://localhost:8000/api/admin/metrics > /var/log/metrics/$(date +\%Y\%m\%d\%H).json
```

#### メトリクスの分析

```python
import requests
import json

# メトリクス取得
response = requests.get("http://localhost:8000/api/admin/metrics")
metrics = response.json()

# 遅いエンドポイントを特定
slow_endpoints = [
    e for e in metrics["endpoints"]
    if e["p95_duration_ms"] > 1000  # 1秒以上
]

print("遅いエンドポイント:")
for endpoint in slow_endpoints:
    print(f"  {endpoint['endpoint']}: p95={endpoint['p95_duration_ms']}ms")

# エラー率の高いエンドポイントを特定
error_endpoints = [
    e for e in metrics["endpoints"]
    if e["error_rate"] > 0.05  # 5%以上
]

print("エラー率の高いエンドポイント:")
for endpoint in error_endpoints:
    print(f"  {endpoint['endpoint']}: {endpoint['error_rate']*100:.2f}%")
```

### 監査ログの検索

```python
from app.services.common.operation_log_service import OperationLogService
from datetime import datetime, timedelta

# 特定ユーザーの操作履歴
logs = log_service.get_operation_logs(
    user_id=1,
    start_date=datetime.now() - timedelta(days=7),
    limit=100,
)

# 特定テーブルの変更履歴
logs = log_service.get_operation_logs(
    target_table="orders",
    operation_type="update",
    start_date=datetime.now() - timedelta(days=1),
)

# 削除操作の履歴
logs = log_service.get_operation_logs(
    operation_type="delete",
    start_date=datetime.now() - timedelta(days=30),
)
```

---

## トラブルシューティング

### ログが出力されない

**症状:** ログファイルが生成されない、またはコンソールに何も表示されない

**原因と対処:**

1. **LOG_FILE_ENABLEDが無効**
   ```env
   # .env
   LOG_FILE_ENABLED=true  # 有効にする
   ```

2. **ログレベルが高すぎる**
   ```env
   # .env
   LOG_LEVEL=INFO  # DEBUGまたはINFOに設定
   ```

3. **logsディレクトリの権限**
   ```bash
   # 権限確認
   ls -ld backend/logs/

   # 権限修正
   chmod 755 backend/logs/
   ```

### JSONログが読みにくい

**症状:** JSON形式のログが1行で出力されて読みにくい

**対処:**

```bash
# jqを使って整形
tail -f backend/logs/app.log | jq '.'

# 特定フィールドのみ表示
tail -f backend/logs/app.log | jq '{timestamp, level, message, request_id}'

# エラーログのみフィルタ
tail -f backend/logs/app.log | jq 'select(.level == "ERROR")'
```

### メトリクスが表示されない

**症状:** `/api/admin/metrics`で空のデータが返される

**原因と対処:**

1. **MetricsMiddlewareが登録されていない**
   ```python
   # app/main.py
   app.add_middleware(MetricsMiddleware)  # 確認
   ```

2. **まだリクエストが処理されていない**
   - いくつかAPIリクエストを実行してから再度確認

3. **メトリクスがリセットされた**
   ```bash
   # リセット確認
   curl http://localhost:8000/api/admin/metrics
   ```

### パフォーマンス問題

**症状:** ロギングによってレスポンスタイムが遅くなった

**対処:**

1. **本番環境でリクエストボディログを無効化**
   ```python
   # app/main.py
   app.add_middleware(
       RequestLoggingMiddleware,
       log_request_body=False,  # 本番環境では無効化
   )
   ```

2. **ログレベルを上げる**
   ```env
   # .env
   LOG_LEVEL=WARNING  # INFOからWARNINGに変更
   ```

3. **非同期ロギングを検討**
   - 現在の実装は同期的だが、高負荷環境では非同期ロギングライブラリ（例: `aiologger`）の導入を検討

### ディスク容量不足

**症状:** ログファイルでディスクが圧迫される

**対処:**

1. **ローテーション設定を調整**
   ```env
   # .env
   LOG_ROTATION_SIZE=52428800     # 50MBに削減
   LOG_BACKUP_COUNT=5             # バックアップ数を削減
   LOG_RETENTION_DAYS=7           # 保持期間を短縮
   ```

2. **古いログの自動削除スクリプト**
   ```bash
   #!/bin/bash
   # cleanup_logs.sh
   find /app/backend/logs/ -name "*.log.*" -mtime +7 -delete
   ```

   ```bash
   # crontabに追加
   0 0 * * * /path/to/cleanup_logs.sh
   ```

---

## ベストプラクティス

### 1. ログレベルの使い分け

- **DEBUG**: 開発時のデバッグ情報（本番では無効化）
- **INFO**: 通常の処理フロー（リクエスト開始/終了など）
- **WARNING**: 想定内のエラー、リトライ可能なエラー
- **ERROR**: エラーだが処理継続可能
- **CRITICAL**: 致命的エラー、サービス停止レベル

### 2. センシティブ情報の保護

```python
# 悪い例
logger.info(f"User login: {username}, password: {password}")

# 良い例
logger.info(
    "User login",
    extra={"username": username},  # パスワードは記録しない
)
```

### 3. 構造化データの活用

```python
# 悪い例
logger.info(f"Order {order_id} created by user {user_id}")

# 良い例
logger.info(
    "Order created",
    extra={
        "order_id": order_id,
        "user_id": user_id,
        "total_amount": total,
    },
)
```

### 4. エラーコンテキストの記録

```python
# 悪い例
except Exception as e:
    logger.error(str(e))

# 良い例
except Exception as e:
    logger.error(
        "Order processing failed",
        extra={
            "order_id": order_id,
            "error_type": type(e).__name__,
        },
        exc_info=True,  # スタックトレース含める
    )
```

---

## まとめ

本ロギング戦略の実装により、以下が実現されました：

✅ **エラー特定の迅速化**
- リクエストIDで全ログを追跡
- エラーコード体系で問題を即座に識別
- 詳細なコンテキスト情報

✅ **監査証跡の確立**
- DBテーブルに重要操作を記録
- コンプライアンス要件への対応

✅ **パフォーマンスの可視化**
- エンドポイントごとのメトリクス
- ボトルネックの即座な特定

✅ **本番環境対応**
- JSON形式ログ（機械可読）
- ログローテーション
- センシティブ情報のマスキング

このドキュメントは、システムの運用、保守、トラブルシューティングの参考として活用してください。
