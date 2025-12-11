"""Base service class with common CRUD operations.

This module provides a generic base service that eliminates code
duplication across 26+ service classes by providing common CRUD
operations, transaction management, and error handling.

Soft Delete Support:
    For models that inherit from SoftDeleteMixin, the service automatically:
    - Filters out soft-deleted records in get_all() by default
    - Uses soft_delete() instead of physical delete
    - Provides hard_delete() for physical deletion (admin only)
"""

from datetime import date
from typing import Any, Generic, TypeVar, cast

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.soft_delete_mixin import (
    SoftDeleteMixin,
)


ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
IDType = TypeVar("IDType", int, str)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType, IDType]):  # noqa: UP046
    """Generic base service with common CRUD operations.

    This class provides:
    - Standard CRUD operations (get_by_id, create, update, delete)
    - Automatic transaction management (commit/rollback)
    - Consistent error handling (404, 409 with user-friendly messages)
    - Type safety through generics (including ID type)
    - Soft delete support for models with SoftDeleteMixin

    Example:
        ```python
        # For integer ID
        class ProductService(BaseService[Product, ProductCreate, ProductUpdate, int]):
            ...

        # For string ID
        class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate, str]):
            ...
        ```
    """

    def __init__(self, db: Session, model: type[ModelType]):
        """Initialize base service.

        Args:
            db: SQLAlchemy database session
            model: SQLAlchemy model class
        """
        self.db = db
        self.model = model
        # Check if model supports soft delete
        self._supports_soft_delete = hasattr(model, "__soft_delete__") and model.__soft_delete__

    def _has_soft_delete_mixin(self) -> bool:
        """Check if the model supports soft delete."""
        return self._supports_soft_delete

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[ModelType]:
        """Get all entities with pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            include_inactive: If True, include soft-deleted records

        Returns:
            List of entities
        """
        query = self.db.query(self.model)

        # Filter out soft-deleted records by default
        if self._has_soft_delete_mixin() and not include_inactive:
            query = query.filter(self.model.valid_to > func.current_date())  # type: ignore[attr-defined]

        result = query.offset(skip).limit(limit).all()
        return cast(list[ModelType], result)

    def count(self, *, include_inactive: bool = False) -> int:
        """Count total entities.

        Args:
            include_inactive: If True, include soft-deleted records

        Returns:
            Total count of entities
        """
        query = self.db.query(self.model)

        if self._has_soft_delete_mixin() and not include_inactive:
            query = query.filter(self.model.valid_to > func.current_date())  # type: ignore[attr-defined]

        return query.count()

    def get_by_id(self, id: IDType, *, raise_404: bool = True) -> ModelType | None:
        """Get entity by ID.

        Args:
            id: Primary key of the entity
            raise_404: If True, raise HTTPException when not found

        Returns:
            Entity instance or None if not found and raise_404=False

        Raises:
            HTTPException: 404 if entity not found and raise_404=True
        """
        instance = cast(ModelType | None, self.db.get(self.model, id))
        if instance is None and raise_404:
            model_name = self.model.__name__
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"{model_name} not found"
            )
        return instance

    def create(self, payload: CreateSchemaType) -> ModelType:
        """Create new entity.

        Args:
            payload: Pydantic schema with create data

        Returns:
            Created entity instance

        Raises:
            HTTPException: 409 if integrity constraint violated (e.g., duplicate key)
        """
        instance = self.model(**payload.model_dump())
        self.db.add(instance)
        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as exc:
            self.db.rollback()
            # Parse database error into user-friendly message
            from app.core.db_error_parser import parse_db_error

            user_message = parse_db_error(exc, payload.model_dump())
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=user_message) from exc

    def update(self, id: IDType, payload: UpdateSchemaType) -> ModelType:
        """Update existing entity.

        Args:
            id: Primary key of the entity to update
            payload: Pydantic schema with update data

        Returns:
            Updated entity instance

        Raises:
            HTTPException: 404 if entity not found, 409 if integrity constraint violated
        """
        instance = self.get_by_id(id)  # raise_404=True raises if not found
        assert instance is not None  # for mypy: get_by_id with raise_404=True never returns None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(instance, field, value)

        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as exc:
            self.db.rollback()
            from app.core.db_error_parser import parse_db_error

            user_message = parse_db_error(exc, payload.model_dump())
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=user_message) from exc

    def delete(self, id: IDType, *, end_date: date | None = None) -> None:
        """Delete entity (soft delete for models with SoftDeleteMixin, hard delete otherwise).

        For models with SoftDeleteMixin, this performs a soft delete by setting
        valid_to to the specified end_date (defaults to today).

        For models without SoftDeleteMixin, this performs a hard delete.

        Args:
            id: Primary key of the entity to delete
            end_date: For soft delete, the date until which the record is valid.
                     Defaults to today (immediately inactive).

        Raises:
            HTTPException: 404 if entity not found
        """
        instance = self.get_by_id(id)
        assert instance is not None

        if self._has_soft_delete_mixin():
            # Soft delete: set valid_to
            cast(SoftDeleteMixin, instance).soft_delete(end_date)
            self.db.commit()
        else:
            # Hard delete for models without soft delete support
            self.db.delete(instance)
            self.db.commit()

    def soft_delete(self, id: IDType, *, end_date: date | None = None) -> ModelType:
        """Soft delete entity by setting valid_to.

        This method is only available for models with SoftDeleteMixin.

        Args:
            id: Primary key of the entity to soft delete
            end_date: The date until which the record is valid.
                     Defaults to today (immediately inactive).

        Returns:
            The soft-deleted entity

        Raises:
            HTTPException: 404 if entity not found
            ValueError: If model doesn't support soft delete
        """
        if not self._has_soft_delete_mixin():
            raise ValueError(f"{self.model.__name__} does not support soft delete")

        instance = self.get_by_id(id)
        assert instance is not None

        cast(SoftDeleteMixin, instance).soft_delete(end_date)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def hard_delete(self, id: IDType) -> None:
        """Permanently delete entity from database.

        This performs a physical DELETE, removing the record completely.
        Use with caution - this operation cannot be undone.

        Note: This should only be used by administrators for
        removing incorrectly created records.

        Args:
            id: Primary key of the entity to permanently delete

        Raises:
            HTTPException: 404 if entity not found
            HTTPException: 409 if entity is referenced by other records
        """
        instance = self.get_by_id(id)
        assert instance is not None

        try:
            self.db.delete(instance)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            model_name = self.model.__name__
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{model_name} cannot be deleted because it is referenced by other records. "
                "Use soft delete instead or remove the referencing records first.",
            ) from exc

    def restore(self, id: IDType) -> ModelType:
        """Restore a soft-deleted entity.

        This method is only available for models with SoftDeleteMixin.

        Args:
            id: Primary key of the entity to restore

        Returns:
            The restored entity

        Raises:
            HTTPException: 404 if entity not found
            ValueError: If model doesn't support soft delete
        """
        if not self._has_soft_delete_mixin():
            raise ValueError(f"{self.model.__name__} does not support soft delete")

        instance = self.get_by_id(id)
        assert instance is not None

        cast(SoftDeleteMixin, instance).restore()
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def _execute_in_transaction(self, func: Any) -> Any:
        """Execute function in transaction with automatic rollback on error.

        This is a helper method for custom business logic that needs
        transactional behavior.

        Args:
            func: Function to execute

        Returns:
            Result of the function

        Raises:
            Exception: Re-raises any exception after rolling back
        """
        try:
            result = func()
            self.db.commit()
            return result
        except Exception as exc:
            self.db.rollback()
            raise exc
