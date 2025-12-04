# mypy エラー修正タスクリスト

**作成日:** 2025-12-04
**総エラー数:** 113件（39ファイル）
**mypyバージョン:** 1.18.2（Python 3.12）

---

## サマリー

| 優先度 | カテゴリ | 件数 | 工数見積 | ステータス |
|--------|----------|------|----------|------------|
| **P1** | assignment (implicit Optional) | 6 | 30分 | 未着手 |
| **P2** | no-any-return | 47 | 3-4時間 | 未着手 |
| **P3** | union-attr | 14 | 1時間 | 未着手 |
| **P4** | override | 6 | 1時間 | 未着手 |
| **P5** | その他 (arg-type, return-value, etc.) | 21 | 2時間 | 未着手 |
| **P6** | attr-defined（要調査） | 19 | 要調査 | 後回し |
| **合計** | | **113件** | **約8時間** | - |

---

## 修正方法ガイド

### P1: assignment (implicit Optional) - 6件

**問題:** デフォルト値が `None` なのに、型に `| None` が含まれていない

```python
# ❌ エラー
def filter_lots(lots, reference_date: date = None):
    pass

# ✅ 修正後
def filter_lots(lots, reference_date: date | None = None):
    pass
```

**影響ファイル:**
- `app/domain/lot/__init__.py` (3件)

---

### P2: no-any-return - 47件

**問題:** SQLAlchemyの `execute().scalar()` などが `Any` 型を返すが、関数の戻り値型は具体的な型を宣言している

**なぜ修正すべきか:**
- 型安全性が保証されない
- IDE の補完やエラーチェックが効かない
- バグの早期発見ができない

**修正方法:**

```python
# ❌ エラー: Returning Any from function declared to return "Product | None"
def get_by_id(self, id: int) -> Product | None:
    return self.db.execute(
        select(Product).where(Product.id == id)
    ).scalar()  # scalar() は Any を返す

# ✅ 修正方法1: 明示的な型キャスト（推奨）
from typing import cast

def get_by_id(self, id: int) -> Product | None:
    result = self.db.execute(
        select(Product).where(Product.id == id)
    ).scalar()
    return cast(Product | None, result)

# ✅ 修正方法2: scalars().first() を使用
def get_by_id(self, id: int) -> Product | None:
    return self.db.scalars(
        select(Product).where(Product.id == id)
    ).first()  # .first() は Optional[T] を返す
```

**影響ファイル（主要）:**
- `app/services/common/base_service.py` (2件)
- `app/repositories/*.py` (8件)
- `app/services/auth/*.py` (8件)
- `app/services/masters/*.py` (10件)
- `app/services/admin/*.py` (5件)
- その他サービス (14件)

---

### P3: union-attr - 14件

**問題:** `None` の可能性がある変数に対してメソッドを呼んでいる

```python
# ❌ エラー: Item "None" of "Product | None" has no attribute "id"
product = get_product_by_code(code)  # Product | None
return product.id  # product が None の可能性

# ✅ 修正方法1: None チェック
product = get_product_by_code(code)
if product is None:
    raise ProductNotFoundError(code)
return product.id

# ✅ 修正方法2: assert（本当に None がありえない場合のみ）
product = get_product_by_code(code)
assert product is not None, f"Product {code} not found"
return product.id
```

**影響ファイル:**
- `app/services/common/uow_service.py` (3件)
- `app/services/common/export_service.py` (2件)
- `app/services/masters/*.py` (6件)
- `app/services/auth/user_service.py` (1件)
- その他 (2件)

---

### P4: override - 6件

**問題:** サブクラスのメソッドシグネチャが親クラスと互換性がない

```python
# ❌ エラー: Signature of "get_all" incompatible with supertype
# 親クラス
class BaseService:
    def get_all(self, skip: int = 0, limit: int = 100) -> list[T]:
        pass

# サブクラス（互換性なし）
class BusinessRulesService(BaseService):
    def get_all(self, skip: int = 0, limit: int = 100,
                rule_type: str | None = None) -> tuple[list[T], int]:
        pass  # 戻り値型も引数も違う

# ✅ 修正方法1: 別名のメソッドにする
class BusinessRulesService(BaseService):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[T]:
        items, _ = self.list_with_count(skip, limit)
        return items

    def list_with_count(self, skip: int = 0, limit: int = 100,
                        rule_type: str | None = None) -> tuple[list[T], int]:
        pass

# ✅ 修正方法2: BaseService の定義を変更（影響範囲が大きい）
```

**影響ファイル:**
- `app/services/admin/business_rules_service.py`
- `app/services/admin/batch_jobs_service.py`
- `app/services/masters/uom_conversion_service.py`
- `app/services/masters/products_service.py`
- `app/services/masters/customer_items_service.py`

---

### P5: その他のエラー - 21件

#### arg-type (7件)
引数の型が期待される型と異なる

```python
# ❌ Argument "username" has incompatible type "str | None"; expected "str"
get_by_username(token_data.username)  # username が str | None

# ✅ None チェック
if token_data.username is None:
    raise AuthError("Invalid token")
get_by_username(token_data.username)
```

#### return-value (4件)
戻り値の型が宣言と異なる

#### valid-type (3件)
関数を型として使っている（型アノテーションの誤り）

```python
# ❌ Function "list" is not valid as a type
get_all = list  # これは型ではなく関数の代入

# ✅ 正しい型アノテーション
def get_all(self) -> list[Product]:
    pass
```

#### var-annotated (2件)
型アノテーションが必要な変数

```python
# ❌ Need type annotation for "result"
result = {}

# ✅ 型アノテーション追加
result: dict[str, Any] = {}
```

#### import-untyped (2件)
型スタブがないライブラリ

```python
# 対応: 型スタブをインストール
# pip install types-PyYAML types-python-dateutil
```

#### func-returns-value (2件)
`None` を返す関数から戻り値を取得している

#### operator (1件)
演算子の型エラー

---

### P6: attr-defined（後回し）- 19件

**問題:** 存在しない属性へのアクセス

**後回しの理由:**
- 一部は別途追加したフィールドの可能性がある
- Enumやクラス定義の確認が必要

**主な問題:**
1. `MetricsCollector` の属性 (12件) - `app/middleware/metrics.py`
2. `StockTransactionType.ALLOCATION_HOLD/RELEASE` (2件) - `app/services/allocations/core.py`
3. `ProductService.list` を型として使用 (3件) - `app/services/masters/products_service.py`
4. その他 (2件)

---

## 実行計画

### Phase 1: 簡単な修正（P1 + import-untyped）

**推定時間:** 30分

1. `app/domain/lot/__init__.py` の implicit Optional 修正 (3件)
2. 型スタブのインストール (`types-PyYAML`, `types-python-dateutil`)

### Phase 2: no-any-return の修正（P2）

**推定時間:** 3-4時間

修正パターン:
1. `cast()` を使った明示的型キャスト
2. `scalars().first()` / `scalars().all()` への変更

優先順:
1. `app/services/common/base_service.py` - 基底クラスなので影響大
2. `app/repositories/*.py` - データアクセス層
3. その他サービス

### Phase 3: union-attr の修正（P3）

**推定時間:** 1時間

None チェックの追加。必要に応じて例外送出。

### Phase 4: override の修正（P4）

**推定時間:** 1時間

メソッド名の変更、または設計の見直し。

### Phase 5: その他（P5）

**推定時間:** 2時間

個別対応。

### Phase 6: attr-defined の調査と修正（P6）

**推定時間:** 要調査

1. `MetricsCollector` クラスの定義確認
2. `StockTransactionType` Enum の定義確認
3. フィールド追加が必要か、コードの修正が必要かを判断

---

## mypy 設定（推奨）

`pyproject.toml` に以下を追加:

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
strict_optional = true

# 段階的に厳格化する場合
[[tool.mypy.overrides]]
module = "app.services.*"
disallow_untyped_defs = false  # 最初は緩く
```

---

## 進捗トラッキング

- [ ] Phase 1: assignment + import-untyped（6件 + 2件）
- [ ] Phase 2: no-any-return（47件）
- [ ] Phase 3: union-attr（14件）
- [ ] Phase 4: override（6件）
- [ ] Phase 5: その他（19件）
- [ ] Phase 6: attr-defined（19件）- 要調査

---

## 参考: mypy 実行コマンド

```bash
# Python 3.12 環境で実行
cd backend
python3.12 -m venv .venv312
source .venv312/bin/activate
pip install mypy types-PyYAML types-python-dateutil
mypy app/

# 特定ファイルのみチェック
mypy app/services/common/base_service.py

# エラーを無視してレポートのみ
mypy app/ --ignore-missing-imports
```
