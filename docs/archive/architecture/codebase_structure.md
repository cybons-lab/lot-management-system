# コードベース構造

## 概要

Lot Management System は、Backend (Python/FastAPI) と Frontend (React/TypeScript) のモノレポ構成です。

## Backend 構造 (Python 3.12 / FastAPI)

### 層構造

```
app/
├── api/           # API層 (ルーター、依存性注入)
├── services/      # ビジネスロジック層
├── repositories/  # データアクセス層
├── models/        # SQLAlchemy モデル層
├── schemas/       # Pydantic スキーマ層 (I/O契約)
├── domain/        # ドメインロジック層 (純粋なビジネスルール)
├── core/          # コア機能 (設定、DB接続、ログ、エラーハンドリング)
├── middleware/    # ミドルウェア
└── db/            # データベースセッション管理
```

### 依存関係の方向性

**単方向依存**（循環参照禁止）:

```
api → services → repositories → models
 ↓         ↓
schemas   domain
```

- **api**: services を呼び出し、schemas で入出力を定義
- **services**: ビジネスロジックを実装、repositories を呼び出し
- **repositories**: データアクセスのみ、models を使用
- **models**: SQLAlchemy モデル定義（DBテーブル構造）
- **schemas**: Pydantic モデル定義（API I/O契約）
- **domain**: 純粋なビジネスルール（FEFO、在庫検証など）

### ファイル配置ルール

#### API Routes (`app/api/routes/`)

- 1機能 = 1ルータファイル
- ファイル名: 複数形（例: `orders.py`, `lots.py`）
- Router prefix: `/` + ファイル名（例: `/orders`, `/lots`）
- `__init__.py` で全ルータをexport

**例**:
```python
# app/api/routes/orders.py
from fastapi import APIRouter

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("")
def list_orders():
    ...
```

#### Services (`app/services/`)

- ビジネスロジックの実装
- トランザクション管理
- 複数のrepositoryを組み合わせる

**例**:
```python
# app/services/order_service.py
class OrderService:
    def create_order_with_validation(self, db: Session, data: OrderCreate):
        # ビジネスロジック
        ...
```

#### Repositories (`app/repositories/`)

- データアクセスのみ
- SQLAlchemy クエリのカプセル化
- CRUD操作の抽象化

**例**:
```python
# app/repositories/order_repository.py
class OrderRepository:
    def find_by_id(self, db: Session, order_id: int):
        return db.query(Order).filter(Order.id == order_id).first()
```

#### Domain (`app/domain/`)

- 純粋なビジネスルール（DBアクセスなし）
- ドメインモデル、バリデーション、ポリシー

**例**:
```python
# app/domain/lot/
class FefoPolicy:
    @staticmethod
    def sort_lots_by_fefo(lots: list[LotCandidate]):
        # FEFOアルゴリズム
        ...
```

---

## Frontend 構造 (React 19 / TypeScript)

### 層構造

```
src/
├── features/      # 機能別コンポーネント（ビジネスロジック含む）
├── components/    # 共有コンポーネント
│   ├── ui/        # Radix UI ベースの汎用UIコンポーネント
│   └── shared/    # プロジェクト固有の共通コンポーネント
├── hooks/         # カスタムフック
│   ├── api/       # API呼び出しフック (TanStack Query)
│   ├── mutations/ # データ更新フック
│   └── ui/        # UI状態管理フック
├── services/      # API通信層（Axiosラッパー）
├── types/         # 型定義（OpenAPI自動生成）
├── utils/         # ユーティリティ関数
├── factories/     # テストデータ生成
└── mocks/         # MSW モックハンドラ
```

### Features構造

各feature（機能）は独立したモジュールとして構成:

```
features/orders/
├── components/    # 機能固有のコンポーネント
├── hooks/         # 機能固有のフック
├── api.ts         # API呼び出し関数
├── types.ts       # 機能固有の型定義
└── index.ts       # Barrel export
```

### 依存関係の方向性

```
features → hooks → services → axios
    ↓        ↓
components/shared  types
    ↓
components/ui
```

- **features**: 機能実装、hooksとcomponents/sharedを使用
- **components/shared**: プロジェクト固有の共通コンポーネント
- **components/ui**: 汎用UIコンポーネント（他に依存しない）
- **hooks/api**: TanStack Query でAPI呼び出し
- **services**: Axiosラッパー（HTTP通信のみ）

### Barrel Export

**許可**:
- `features/*/index.ts` - 機能のpublic APIをexport
- `components/ui/*/index.ts` - UI コンポーネントのexport

**禁止**:
- `components/shared` - 直import推奨（循環参照回避）
- `hooks/api` - 直import推奨

---

## 命名規約

### Backend (Python)

| 要素 | 規約 | 例 |
|------|------|-----|
| ファイル | snake_case | `order_service.py` |
| 関数/変数 | snake_case | `create_order()`, `order_id` |
| クラス | PascalCase | `OrderService`, `OrderRepository` |
| 定数 | UPPER_SNAKE_CASE | `MAX_ORDER_ITEMS` |
| プライベート | _prefix | `_internal_function()` |

### Frontend (TypeScript)

| 要素 | 規約 | 例 |
|------|------|-----|
| ファイル（コンポーネント） | PascalCase | `OrderCard.tsx` |
| ファイル（その他） | kebab-case | `order-service.ts` |
| コンポーネント | PascalCase | `OrderCard`, `PageHeader` |
| hooks | use* (camelCase) | `useOrders()`, `useOrderDetail()` |
| 関数/変数 | camelCase | `createOrder()`, `orderId` |
| 型/Interface | PascalCase | `OrderResponse`, `OrderFilters` |
| 定数 | UPPER_SNAKE_CASE | `MAX_ITEMS_PER_PAGE` |

---

## Import 方針

### Backend

- **絶対import**: `from app.services.order_service import OrderService`
- **相対import禁止**: ~~`from ..services import OrderService`~~
- **Import順序** (Ruff I001):
  1. 標準ライブラリ
  2. サードパーティ
  3. アプリケーション内部 (`app.*`)

### Frontend

- **alias使用**: `@/` で `src/` を参照
- **Type import**: `import type { ... }` または `import { type ... }`
- **Import順序** (ESLint import/order):
  1. React/React関連
  2. 外部ライブラリ
  3. 内部モジュール (`@/*`)
  4. 相対パス

**例**:
```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { OrderResponse } from "@/types/api";
import { getOrders } from "@/features/orders/api";
```

---

## CI チェックコマンド

### Backend

```bash
cd backend

# Lint
ruff check app/

# Format check
ruff format --check app/

# Combined (CI用)
ruff check app/ && ruff format --check app/
```

### Frontend

```bash
cd frontend

# Type check
npm run typecheck

# Lint
npm run lint --max-warnings=0

# Format check
npm run format:check

# Combined (CI用)
npm run typecheck && npm run lint && npm run format:check
```

---

## 更新履歴

- **2025-11-10**: 初版作成（リファクタリングPhase 6）
