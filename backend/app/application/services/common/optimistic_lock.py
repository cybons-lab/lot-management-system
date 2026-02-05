from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import date, timedelta
from typing import Any, Protocol, cast, runtime_checkable

from fastapi import HTTPException, status
from sqlalchemy import CursorResult, Result, delete, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


@runtime_checkable
class VersionedModel(Protocol):
    """Protocol for models that support optimistic locking via 'version' column."""

    version: Any


DEFAULT_CONFLICT_MESSAGE = "他のユーザーが更新しました。最新データを取得してください。"


def _build_conflict_detail(expected_version: int, current_version: int) -> dict:
    return {
        "error": "OPTIMISTIC_LOCK_CONFLICT",
        "current_version": current_version,
        "expected_version": expected_version,
        "message": DEFAULT_CONFLICT_MESSAGE,
    }


def _ensure_filters(filters: Sequence) -> Sequence:
    if not filters:
        raise ValueError("filters must not be empty")
    return filters


def update_with_version[T: VersionedModel](
    db: Session,
    model: type[T],
    *,
    filters: Sequence,
    update_values: dict,
    expected_version: int,
    not_found_detail: str,
) -> T:
    """Update a row with optimistic lock check (UPDATE ... WHERE version=expected)."""
    _ensure_filters(filters)

    # Use getattr to avoid Mypy's attr-defined on dynamically generated SQLAlchemy columns
    model_version = model.version
    stmt = (
        update(model)
        .where(*filters, model_version == expected_version)
        .values(**update_values, version=model_version + 1)
    )
    result: Result = db.execute(stmt)
    # Result itself doesn't have rowcount in type stubs, but CursorResult does.
    # We cast to CursorResult to satisfy Mypy for rowcount access.
    rowcount = cast(CursorResult, result).rowcount

    if rowcount == 0:
        current = db.query(model).filter(*filters).first()
        if current is None:
            logger.warning(
                "Optimistic lock: record not found",
                extra={"model": model.__name__, "expected_version": expected_version},
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
        logger.warning(
            "Optimistic lock conflict detected",
            extra={
                "model": model.__name__,
                "expected_version": expected_version,
                "current_version": current.version,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_build_conflict_detail(expected_version, current.version),
        )

    db.commit()
    updated = db.query(model).filter(*filters).first()
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
    return updated


def soft_delete_with_version[T: VersionedModel](
    db: Session,
    model: type[T],
    *,
    filters: Sequence,
    expected_version: int,
    end_date: date | None,
    not_found_detail: str,
) -> None:
    """Soft delete a row by setting valid_to, with optimistic lock check."""
    _ensure_filters(filters)

    delete_date = end_date if end_date is not None else date.today() - timedelta(days=1)
    model_version = model.version

    stmt = (
        update(model)
        .where(*filters, model_version == expected_version)
        .values(valid_to=delete_date, version=model_version + 1)
    )
    result: Result = db.execute(stmt)
    rowcount = cast(CursorResult, result).rowcount

    if rowcount == 0:
        current = db.query(model).filter(*filters).first()
        if current is None:
            logger.warning(
                "Optimistic lock: record not found (soft delete)",
                extra={"model": model.__name__, "expected_version": expected_version},
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
        logger.warning(
            "Optimistic lock conflict detected (soft delete)",
            extra={
                "model": model.__name__,
                "expected_version": expected_version,
                "current_version": current.version,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_build_conflict_detail(expected_version, current.version),
        )

    db.commit()


def hard_delete_with_version[T: VersionedModel](
    db: Session,
    model: type[T],
    *,
    filters: Sequence,
    expected_version: int,
    not_found_detail: str,
    conflict_detail: str | None = None,
) -> None:
    """Hard delete a row with optimistic lock check."""
    _ensure_filters(filters)

    model_version = model.version
    stmt = delete(model).where(*filters, model_version == expected_version)

    try:
        result: Result = db.execute(stmt)
        rowcount = cast(CursorResult, result).rowcount
        if rowcount == 0:
            current = db.query(model).filter(*filters).first()
            if current is None:
                logger.warning(
                    "Optimistic lock: record not found (hard delete)",
                    extra={"model": model.__name__, "expected_version": expected_version},
                )
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
            logger.warning(
                "Optimistic lock conflict detected (hard delete)",
                extra={
                    "model": model.__name__,
                    "expected_version": expected_version,
                    "current_version": current.version,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_build_conflict_detail(expected_version, current.version),
            )

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.error(
            "Hard delete failed: integrity constraint violation",
            extra={"model": model.__name__, "error": str(exc)[:500]},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict_detail
            or "このデータは他のレコードから参照されているため削除できません",
        ) from exc
