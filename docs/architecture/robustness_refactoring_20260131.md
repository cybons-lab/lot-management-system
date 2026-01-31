# 堅牢性向上リファクタリング設計書 (BaseService & Transaction Management)

## 概要
システム全体の堅牢性を向上させるため、トランザクション管理、ロック制御、エラーハンドリングの基盤部分を再設計しました。
特に `BaseService` におけるトランザクション制御の変更点は、今後の開発における標準パターンとなります。

## 1. BaseService のトランザクション管理
従来の `BaseService` はメソッド内で `commit()` を強制的に実行していましたが、これを呼び出し元で制御可能に変更しました。

### 変更点
CRUDメソッド（`create`, `update`, `delete` 等）に `auto_commit: bool = True` 引数を追加しました。

- **auto_commit=True (Default)**:
  - 従来通りの挙動。メソッド終了時に `commit()` が実行されます。
  - 単発のAPIリクエスト処理などに適しています。

- **auto_commit=False**:
  - `flush()` のみ実行し、`commit()` は実行しません。
  - **Unit of Work (UoW) パターン** や、複数のサービスを跨ぐ一括処理で使用します。
  - 呼び出し元が責任を持って `db.commit()` または `db.rollback()` を行う必要があります。

### 実装例
```python
# 単発処理 (従来通り)
service.create(schema)  # commitされる

# 複合処理 (新しいパターン)
try:
    # 注文作成 (commitしない)
    order = order_service.create(order_data, auto_commit=False)
    
    # 関連処理
    stock_service.allocate(order, auto_commit=False)
    
    # 全て成功したらコミット
    db.commit()
except Exception:
    db.rollback()
    raise
```

## 2. 悲観的ロック (Pessimistic Locking)
同時編集によるデータ競合を防ぐため、物理的な行ロックを導入します。

### 変更点
`acquire_lock` メソッドで `SELECT ... FOR UPDATE` を発行します。
これにより、アプリケーションレベルのフラグ管理（`locked_by_user_id`）だけでなく、DBレベルでの排他制御を保証します。

- **NOWAITオプション**: ロック取得待ちでプロセスがブロックされるのを防ぐため、即時エラーとする（要件によるが、UXのために待機させない方針）。

## 3. 部分的失敗への対応 (Partial Failures)
「注文作成は成功させたいが、自動引当は失敗しても良い（後でリトライする）」といった要件に対応するため、セーブポイントを活用します。

### 実装方針
`create_order` 内など重要なビジネスロジックブロック内で `db.begin_nested()` を使用します。

```python
# 注文自体は保存
db.add(order)
db.flush()

# 付随処理 (失敗許容)
try:
    with db.begin_nested():
        auto_reserve_line(line)
except Exception as e:
    # ここでロールバックしても、注文(order)のflush状態は維持される
    logger.warning(f"Auto reservation failed: {e}")

db.commit() # 注文はコミットされる
```

## 4. 単位の厳格化
データ品質を保証するため、不明な単位変換が発生した場合は「1:1でフォールバック」するのではなく、明示的にエラーとします。
これにより、不正な単位データがシステムに混入するのを防ぎます。
