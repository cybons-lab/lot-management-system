# エラーロギングとハンドリング改善計画

**作成日**: 2025-11-28
**ステータス**: 計画中
**優先度**: Medium

---

## 概要

システムのエラーロギングとハンドリング機能を改善し、ユーザー体験の向上と開発効率の向上を図る。

### 主要な改善項目

1. **フロントエンドエラーロギングの実装**
2. **データベースエラーのユーザーフレンドリー化**
3. **JWT認証の目的明確化とオプショナル認証の実装**

---

## 1. フロントエンドエラーロギング

### 現状

- フロントエンドにエラーロギングの仕組みが存在しない
- エラー発生時の追跡が困難
- ユーザーが遭遇したエラーの詳細が不明

### 目標

- クライアント側でのエラーキャッチと記録
- 開発時のデバッグ効率向上
- 本番環境でのエラー追跡（オプション）

### 実装方針

#### 1.1. Error Boundary の実装

**場所**: `frontend/src/components/error/ErrorBoundary.tsx`

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/services/error-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーをログに記録
    logError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>エラーが発生しました</h2>
          <p>ページを再読み込みしてください。</p>
          {process.env.NODE_ENV === 'development' && (
            <pre>{this.state.error?.message}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 1.2. Error Logger サービス

**場所**: `frontend/src/services/error-logger.ts`

```typescript
export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  log(
    level: ErrorLogEntry['level'],
    source: string,
    error: Error | string,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(entry);

    // ログ数の制限
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${level.toUpperCase()}] ${source}:`, error, context);
    }

    // オプション: バックエンドへの送信
    // this.sendToBackend(entry);
  }

  error(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log('error', source, error, context);
  }

  warning(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log('warning', source, error, context);
  }

  info(source: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', source, message, context);
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  // オプション: バックエンドへのエラー送信
  private async sendToBackend(entry: ErrorLogEntry): Promise<void> {
    try {
      await fetch('/api/frontend-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      // バックエンド送信失敗は無視（無限ループ防止）
      console.warn('Failed to send error to backend:', err);
    }
  }
}

export const errorLogger = new ErrorLogger();

// 便利関数
export const logError = (source: string, error: Error | string, context?: Record<string, unknown>) => {
  errorLogger.error(source, error, context);
};
```

#### 1.3. API エラーハンドリングの統合

**場所**: `frontend/src/services/api-client.ts` (既存ファイルの拡張)

```typescript
import axios, { AxiosError } from 'axios';
import { errorLogger } from './error-logger';

// ... 既存のコード ...

// レスポンスエラーのインターセプター
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // APIエラーをログに記録
    errorLogger.error('API', error, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);
```

#### 1.4. グローバルエラーハンドラー

**場所**: `frontend/src/App.tsx` (既存ファイルの拡張)

```typescript
import { useEffect } from 'react';
import { errorLogger } from '@/services/error-logger';

function App() {
  useEffect(() => {
    // グローバルエラーハンドラー
    const handleError = (event: ErrorEvent) => {
      errorLogger.error('Global', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Unhandled Promise Rejection
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorLogger.error('UnhandledRejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* 既存のコンテンツ */}
    </ErrorBoundary>
  );
}
```

### 実装ステップ

1. Error Logger サービスの作成
2. Error Boundary コンポーネントの作成
3. API Client へのエラーロギング追加
4. App.tsx へのグローバルエラーハンドラー追加
5. テストとデバッグ

### オプション機能

- **バックエンドへのエラー送信**: 本番環境でのエラー集約
- **エラーダッシュボード**: 開発用のエラー一覧表示
- **Session Replay**: エラー発生時のユーザー操作の記録

---

## 2. データベースエラーのユーザーフレンドリー化

### 現状

**問題点**:
- データベースエラー（`IntegrityError` など）がそのままユーザーに表示される
- 技術的なメッセージで分かりにくい（例: "UNIQUE constraint failed"）
- どのフィールドが重複しているか不明確

**既存の TODO**:
`backend/app/services/masters/products_service.py:37` に以下のコメント：
```python
except IntegrityError as exc:  # TODO: inspect constraint name for precise messaging
```

### 目標

データベースエラーをユーザーが理解しやすいメッセージに変換する。

**例**:
- **Before**: `IntegrityError: duplicate key value violates unique constraint "uq_products_maker_part_code"`
- **After**: `製品コード 'ABC-123' は既に登録されています`

### 実装方針

#### 2.1. DB エラーパーサー

**場所**: `backend/app/core/db_error_parser.py` (新規作成)

```python
"""Database error parser for user-friendly messages."""

import re
from typing import Any

from sqlalchemy.exc import IntegrityError


class DBErrorParser:
    """Parse database errors into user-friendly messages."""

    # 制約名とメッセージのマッピング
    CONSTRAINT_MESSAGES = {
        # Products
        "uq_products_maker_part_code": "製品コード '{value}' は既に登録されています",
        "uq_products_our_part_code": "社内品番 '{value}' は既に登録されています",

        # Warehouses
        "uq_warehouses_warehouse_code": "倉庫コード '{value}' は既に登録されています",

        # Suppliers
        "uq_suppliers_supplier_code": "仕入先コード '{value}' は既に登録されています",

        # Customers
        "uq_customers_customer_code": "顧客コード '{value}' は既に登録されています",

        # Lots
        "uq_lots_lot_number": "ロット番号 '{value}' は既に登録されています",

        # Orders
        "uq_orders_order_number": "受注番号 '{value}' は既に登録されています",

        # Users
        "uq_users_username": "ユーザー名 '{value}' は既に使用されています",
        "uq_users_email": "メールアドレス '{value}' は既に登録されています",

        # User-Supplier Assignments
        "uq_user_supplier_assignments_user_supplier": "このユーザーは既にこの仕入先の担当として登録されています",
        "uq_user_supplier_primary_per_supplier": "この仕入先には既に主担当が割り当てられています",

        # Foreign Key Violations
        "fk_lots_product_id": "指定された製品が見つかりません",
        "fk_lots_warehouse_id": "指定された倉庫が見つかりません",
        "fk_lots_supplier_id": "指定された仕入先が見つかりません",
    }

    @classmethod
    def parse_integrity_error(cls, exc: IntegrityError, context: dict[str, Any] | None = None) -> str:
        """Parse IntegrityError into user-friendly message.

        Args:
            exc: SQLAlchemy IntegrityError
            context: Additional context (e.g., input data)

        Returns:
            User-friendly error message
        """
        error_msg = str(exc.orig)

        # Extract constraint name
        constraint_match = re.search(r'constraint ["\']?(\w+)["\']?', error_msg)
        if not constraint_match:
            return cls._get_generic_message(error_msg)

        constraint_name = constraint_match.group(1)

        # Get template message
        template = cls.CONSTRAINT_MESSAGES.get(constraint_name)
        if not template:
            return cls._get_generic_message(error_msg)

        # Extract value if available
        value = cls._extract_value(error_msg, context)

        # Format message
        if '{value}' in template and value:
            return template.format(value=value)
        return template

    @classmethod
    def _extract_value(cls, error_msg: str, context: dict[str, Any] | None) -> str | None:
        """Extract the duplicate value from error message or context."""
        # Try to extract from error message
        # PostgreSQL: DETAIL:  Key (column_name)=(value) already exists.
        detail_match = re.search(r'\(([^)]+)\)=\(([^)]+)\)', error_msg)
        if detail_match:
            return detail_match.group(2)

        # Try to extract from context (if provided)
        if context and isinstance(context, dict):
            # Simple heuristic: return first string value
            for value in context.values():
                if isinstance(value, str):
                    return value

        return None

    @classmethod
    def _get_generic_message(cls, error_msg: str) -> str:
        """Generate generic error message."""
        if 'unique' in error_msg.lower():
            return "データが重複しています。別の値を入力してください。"
        if 'foreign key' in error_msg.lower():
            return "関連するデータが見つかりません。"
        if 'not null' in error_msg.lower():
            return "必須項目が入力されていません。"
        return "データベースエラーが発生しました。入力内容を確認してください。"


def parse_db_error(exc: Exception, context: dict[str, Any] | None = None) -> str:
    """Parse database error into user-friendly message.

    Convenience function for error handlers.

    Args:
        exc: Database exception
        context: Additional context

    Returns:
        User-friendly error message
    """
    if isinstance(exc, IntegrityError):
        return DBErrorParser.parse_integrity_error(exc, context)

    # Other database errors can be added here
    return "データベースエラーが発生しました。"
```

#### 2.2. サービス層での利用

**場所**: `backend/app/services/masters/products_service.py` (既存ファイルの修正)

```python
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.core.db_error_parser import parse_db_error

class ProductService:
    # ... 既存のコード ...

    def create_product(self, payload: ProductCreate) -> Product:
        """Create a new product."""
        product = Product(**payload.model_dump())
        try:
            return self.repository.create(product)
        except IntegrityError as exc:
            # パーサーを使ってユーザーフレンドリーなメッセージを生成
            user_message = parse_db_error(exc, payload.model_dump())
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=user_message
            ) from exc
```

#### 2.3. グローバルエラーハンドラーでの利用（オプション）

**場所**: `backend/app/core/errors.py` (既存ファイルの拡張)

```python
from sqlalchemy.exc import IntegrityError
from app.core.db_error_parser import parse_db_error

async def database_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Handle database integrity errors with user-friendly messages."""

    # ユーザーフレンドリーなメッセージを生成
    user_message = parse_db_error(exc)

    logger.warning(
        f"Database integrity error: {type(exc).__name__}",
        extra={
            "exception_type": type(exc).__name__,
            "detail": str(exc.orig),
            "path": request.url.path,
            "method": request.method,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_problem_json(
            title="Database Constraint Violation",
            status_code=status.HTTP_409_CONFLICT,
            detail=user_message,
            instance=str(request.url.path),
            error_code="INTEGRITY_ERROR",
        ),
    )
```

**main.py への登録**:
```python
from sqlalchemy.exc import IntegrityError
from app.core.errors import database_exception_handler

app.add_exception_handler(IntegrityError, database_exception_handler)
```

### 実装ステップ

1. `db_error_parser.py` の作成
2. 制約名とメッセージのマッピング追加
3. 既存サービスでの利用（products_service など）
4. テストケースの作成
5. 他のサービスへの適用

### テストケース例

```python
# tests/unit/test_db_error_parser.py

from sqlalchemy.exc import IntegrityError
from app.core.db_error_parser import DBErrorParser

def test_parse_unique_constraint_with_value():
    error_msg = 'duplicate key value violates unique constraint "uq_products_maker_part_code" DETAIL: Key (maker_part_code)=(ABC-123) already exists.'

    mock_exc = IntegrityError(statement="", params={}, orig=Exception(error_msg))
    result = DBErrorParser.parse_integrity_error(mock_exc)

    assert "製品コード 'ABC-123' は既に登録されています" == result
```

---

## 3. JWT認証の目的明確化とオプショナル認証

### 現状

**実装状態**:
- JWT認証が実装済み (`backend/app/services/auth/auth_service.py`)
- `OAuth2PasswordBearer` による認証必須の設定
- ユーザー・ロール・仕入先担当割り当てのモデルが存在

**既存の機能**:
- `UserSupplierAssignment`: ユーザーと仕入先の担当割り当て
- `is_primary`: 主担当フラグ
- 目的: 画面での優先表示、フィルタリング、責任範囲の明確化

### 要件の明確化

**ユーザーの意図**:
> 認証にJWTを使うってメモってるけど、これはあくまでも誰が接続されたかを識別したいだけで、ログインしないと何も見れない形にしようとって訳じゃない。
> 主目的は自分が主担当の仕入元に関するものが優先的に表示できるようにしたいだけ

**つまり**:
- ❌ ログイン必須（強制認証）ではない
- ✅ オプショナル認証（識別のみ）
- ✅ ログインしていなくてもデータ閲覧可能
- ✅ ログインすると担当仕入先の優先表示

### 実装方針

#### 3.1. オプショナル認証の実装

**場所**: `backend/app/services/auth/auth_service.py` (既存ファイルの拡張)

```python
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User
from app.services.auth.user_service import UserService


# 認証必須の場合
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/login")

# オプショナル認証の場合（auto_error=False）
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/login",
    auto_error=False  # トークンがない場合でもエラーにしない
)


class AuthService:
    # ... 既存のコード ...

    @staticmethod
    def get_current_user_optional(
        token: str | None = Depends(optional_oauth2_scheme),
        db: Session = Depends(get_db)
    ) -> User | None:
        """Get the current user if authenticated, otherwise return None.

        This allows optional authentication - endpoints can work both
        for authenticated and unauthenticated users.

        Returns:
            User object if authenticated, None otherwise
        """
        if not token:
            return None

        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            username: str = payload.get("sub")
            if username is None:
                return None
        except JWTError:
            return None

        user_service = UserService(db)
        user = user_service.get_by_username(username=username)
        return user
```

#### 3.2. API での利用

**場所**: `backend/app/api/routes/inventory/lots_router.py` (例)

```python
from typing import Annotated
from fastapi import Depends, Query
from app.services.auth.auth_service import AuthService
from app.models.auth_models import User

# オプショナル認証
CurrentUserOptional = Annotated[User | None, Depends(AuthService.get_current_user_optional)]

@router.get("/lots")
def list_lots(
    current_user: CurrentUserOptional = None,
    supplier_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """List lots with optional user context.

    If user is authenticated, prioritize their assigned suppliers.
    """
    # ユーザーが認証されている場合、担当仕入先を優先
    if current_user:
        # ユーザーの担当仕入先IDを取得
        assigned_supplier_ids = [
            assignment.supplier_id
            for assignment in current_user.supplier_assignments
        ]

        # フィルタ指定がない場合は担当仕入先のみ表示（オプション）
        if supplier_id is None and assigned_supplier_ids:
            # Option 1: 担当仕入先のみ表示
            # lots = get_lots_by_suppliers(db, assigned_supplier_ids)

            # Option 2: 全て表示するが担当を優先順でソート
            lots = get_lots_with_priority_sort(db, assigned_supplier_ids)
        else:
            lots = get_all_lots(db, supplier_id)
    else:
        # 未認証の場合は通常通り全データを表示
        lots = get_all_lots(db, supplier_id)

    return lots
```

#### 3.3. フロントエンドでの利用

**場所**: `frontend/src/features/inventory/components/LotList.tsx` (例)

```typescript
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { useLots } from '../hooks/useLots';

export const LotList = () => {
  const { data: currentUser } = useCurrentUser(); // オプショナル
  const { data: lots, isLoading } = useLots();

  return (
    <div>
      {currentUser && (
        <div className="user-info">
          ログイン中: {currentUser.display_name}
          {currentUser.supplier_assignments?.length > 0 && (
            <span> (担当仕入先: {currentUser.supplier_assignments.length}件)</span>
          )}
        </div>
      )}

      {/* ロット一覧 */}
      {/* 認証済みの場合、担当仕入先のロットが優先的に表示される */}
      <LotTable data={lots} />
    </div>
  );
};
```

### 実装ステップ

1. `optional_oauth2_scheme` の追加
2. `get_current_user_optional` の実装
3. 既存エンドポイントでの適用検討
4. フロントエンドでのオプショナル認証対応
5. 担当仕入先の優先表示ロジック実装

### 設計決定事項

| 項目 | 決定内容 |
|------|---------|
| **認証方式** | JWT（既存） |
| **認証の必須性** | オプショナル（未ログインでも閲覧可能） |
| **未認証時の動作** | 全データを通常通り表示 |
| **認証時の動作** | 担当仕入先のデータを優先表示 |
| **フィルタリング** | ユーザーの選択に応じて（担当のみ/全て） |
| **主担当の扱い** | UI上で強調表示（バッジなど） |

### 今後の検討事項

- **権限管理**: ロールベースのアクセス制御が必要になった場合
- **データ制限**: 特定のユーザーには特定のデータのみ表示（機密情報など）
- **監査ログ**: ユーザー操作の記録（誰が何をしたか）

---

## 実装優先順位

### High Priority（早急に実装）

1. **データベースエラーのユーザーフレンドリー化**
   - ユーザー体験への直接的な影響が大きい
   - 既存のTODOコメントがある
   - 実装が比較的単純

### Medium Priority（中期的に実装）

2. **フロントエンドエラーロギング**
   - 開発効率の向上
   - デバッグの容易化
   - 段階的な実装が可能

3. **JWT認証のオプショナル化**
   - 既存の認証機能の拡張
   - ビジネス要件との整合性確保

### Low Priority（将来的な拡張）

- フロントエンドエラーのバックエンド送信
- エラーダッシュボード
- Session Replay機能

---

## まとめ

この計画により、以下の改善が期待できます：

1. **ユーザー体験の向上**
   - 分かりやすいエラーメッセージ
   - スムーズなデータ閲覧（認証なしでも可能）
   - 担当データの優先表示

2. **開発効率の向上**
   - フロントエンドエラーの追跡
   - デバッグの容易化
   - 一貫したエラーハンドリング

3. **保守性の向上**
   - エラー処理の一元管理
   - 明確な認証ポリシー
   - 拡張可能な設計

---

## 関連ドキュメント

- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のガイドライン
- [backend/app/core/errors.py](../../backend/app/core/errors.py) - 既存のエラーハンドラー
- [backend/app/services/auth/auth_service.py](../../backend/app/services/auth/auth_service.py) - 認証サービス
- [backend/app/models/assignments/assignment_models.py](../../backend/app/models/assignments/assignment_models.py) - ユーザー仕入先割り当て

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-11-28 | 初版作成 | Claude |
