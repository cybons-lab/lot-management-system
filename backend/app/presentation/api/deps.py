# backend/app/api/deps.py
"""API 依存性注入ヘルパー（UnitOfWork DI追加版） 共通の依存関係とユーティリティ.

【設計意図】依存性注入（DI）パターンの設計判断:

1. なぜ依存性注入を使うのか
   理由: レイヤー間の疎結合化とテスタビリティ向上
   設計原則: Dependency Inversion Principle（依存性逆転の原則）
   メリット:
   - テスト時にモックDBセッションに差し替え可能
   - ルーター層がデータベース層の実装詳細を知らない
   - トランザクション管理をサービス層に委譲

2. get_db() と get_uow() の使い分け
   理由: 読み取り専用と更新系でトランザクション管理を分離

   get_db(): 読み取り専用エンドポイント
   - 用途: GET エンドポイント、検索、一覧表示
   - トランザクション: 不要（読み取りのみ）
   - 例:
   ```python
   @router.get("/products")
   def list_products(db: Session = Depends(get_db)):
       products = db.query(Product).all()
       return products
   ```

   get_uow(): 更新系エンドポイント
   - 用途: POST/PUT/DELETE エンドポイント、データ変更
   - トランザクション: 自動管理（commit/rollback）
   - 例:
   ```python
   @router.post("/orders")
   def create_order(
       data: OrderCreate,
       uow: UnitOfWork = Depends(get_uow)
   ):
       service = OrderService(uow.session)
       order = service.create(data)
       uow.commit()  # 明示的にコミット
       return order
   ```

3. なぜ get_db() で rollback するのか（L22）
   理由: 例外発生時のセッションクリーンアップ
   動作:
   - 正常時: セッションを閉じるだけ（読み取り専用なのでコミット不要）
   - 例外時: rollback() でセッション状態をリセット
   → 次のリクエストで古いトランザクションが残らない

4. なぜ UnitOfWork を使うのか
   理由: トランザクション管理の一元化
   設計パターン: Unit of Work パターン
   メリット:
   - トランザクション境界が明確（with文）
   - commit/rollback の呼び出しを統一
   - 複数のサービスをまたぐトランザクションも管理可能
   例:
   ```python
   with UnitOfWork(SessionLocal) as uow:
       order_service = OrderService(uow.session)
       allocation_service = AllocationService(uow.session)

       order = order_service.create(order_data)
       allocation_service.allocate(order.id)

       uow.commit()  # 一括コミット
   ```

5. ジェネレータパターンの使用（L12, L28）
   理由: FastAPI の Depends() で必須
   動作:
   - yield 前: リソース初期化（セッション作成）
   - yield: エンドポイント関数にリソースを渡す
   - yield 後: リソースクリーンアップ（セッション閉じる）
   メリット:
   - 必ずクリーンアップが実行される
   - try-finally パターンを簡潔に記述

6. SessionLocal への直接参照の回避
   理由: プレゼンテーション層がインフラ層の実装詳細を知らない
   設計:
   - ルーター → Depends(get_db) / Depends(get_uow)
   - deps.py → SessionLocal
   → ルーターは SessionLocal の存在を知らない
   メリット:
   - SessionLocal の実装変更がルーター層に影響しない
   - テスト時に get_db() をモックに差し替えやすい

7. なぜ2つのDI関数が必要なのか
   理由: RESTful APIのベストプラクティス
   原則:
   - GET: 冪等（何度実行しても同じ結果）→ トランザクション不要
   - POST/PUT/DELETE: 非冪等（状態が変わる）→ トランザクション必要
   運用:
   - get_db(): 軽量、高速、並行実行可能
   - get_uow(): トランザクション管理、直列化
   → 必要最小限のロックで、パフォーマンスとデータ整合性を両立
"""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.application.services.common.uow_service import UnitOfWork
from app.core.database import SessionLocal


def get_db() -> Generator[Session]:
    """データベースセッションの依存性注入（読み取り専用用）.

    Yields:
        Session: SQLAlchemyセッション
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_uow() -> Generator[UnitOfWork]:
    """UnitOfWorkの依存性注入（更新系用）.

    Note:
        - トランザクション管理が必要な更新系エンドポイントで使用
        - SessionLocalへの直接参照を避け、層の分離を維持

    Yields:
        UnitOfWork: トランザクション管理を行うUnitOfWorkインスタンス

    Example:
        @router.post("/resource")
        def create_resource(
            data: ResourceCreate,
            uow: UnitOfWork = Depends(get_uow)
        ):
            service = ResourceService(uow.session)
            return service.create(data)
    """
    with UnitOfWork(SessionLocal) as uow:
        yield uow
