# backend/app/api/deps.py
"""API 依存性注入ヘルパー（UnitOfWork DI追加版） 共通の依存関係とユーティリティ."""

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
