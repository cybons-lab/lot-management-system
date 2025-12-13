# 例外ハンドリング設計ガイド

バックエンドAPIでの例外処理に関するガイドラインです。

## 設計方針

### グローバル例外ハンドラ

`backend/app/core/errors.py` に集約されたグローバルハンドラが、すべての例外を適切なHTTPレスポンスに変換します。

**router側で明示的に `try/except` を書く必要は基本的にありません。**

### 例外→HTTPステータスのマッピング

| 例外クラス | HTTPステータス |
|-----------|---------------|
| `*NotFoundError` | 404 Not Found |
| `InsufficientStockError` | 409 Conflict |
| `AllocationCommitError` | 400 Bad Request |
| `*ValidationError` | 422 Unprocessable Entity |
| `Duplicate*Error` | 409 Conflict |
| その他の `DomainError` | 400 Bad Request |
| 未捕捉の例外 | 500 Internal Server Error |

## 開発者向けガイドライン

### 1. 新しいドメイン例外を追加する場合

```python
# 1. domain/your_domain/exceptions.py に例外を定義
from app.domain.errors import DomainError

class YourNewError(DomainError):
    pass

# 2. core/errors.py の DOMAIN_EXCEPTION_MAP に追加
DOMAIN_EXCEPTION_MAP: dict[type[DomainError], int] = {
    ...
    YourNewError: status.HTTP_400_BAD_REQUEST,  # 適切なステータス
    ...
}
```

### 2. router側での例外処理

```python
# ❌ 悪い例: 明示的に500を返す
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

# ✅ 良い例: グローバルハンドラに委譲
except Exception:
    raise  # グローバルハンドラが適切に処理

# ✅ 良い例: 詳細なレスポンスが必要な場合のみ明示的に処理
except InsufficientStockError as e:
    raise HTTPException(
        status_code=409,
        detail={
            "error": "INSUFFICIENT_STOCK",
            "lot_id": e.lot_id,
            "required": e.required,
            "available": e.available,
        }
    )
```

### 3. レスポンスフォーマット

グローバルハンドラは [RFC 7807 Problem+JSON](https://tools.ietf.org/html/rfc7807) 形式でレスポンスを返します：

```json
{
  "type": "about:blank",
  "title": "InsufficientStockError",
  "status": 409,
  "detail": "ロット LOT-001 の在庫が不足しています",
  "instance": "/api/allocations/123/confirm",
  "error_code": "InsufficientStockError"
}
```

## 関連ファイル

- `backend/app/core/errors.py` - グローバルハンドラ
- `backend/app/domain/errors.py` - ベース例外クラス
- `backend/app/domain/*/exceptions.py` - ドメイン別例外
