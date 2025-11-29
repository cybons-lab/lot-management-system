"""Base service class with common CRUD operations.

This module provides a generic base service that eliminates code duplication
across 26+ service classes by providing common CRUD operations, transaction
management, and error handling.
"""

from typing import Any, Generic, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic base service with common CRUD operations.

    This class provides:
    - Standard CRUD operations (get_by_id, create, update, delete)
    - Automatic transaction management (commit/rollback)
    - Consistent error handling (404, 409 with user-friendly messages)
    - Type safety through generics

    Example:
        ```python
        class ProductService(BaseService[Product, ProductCreate, ProductUpdate]):
            def __init__(self, session: Session):
                super().__init__(db=session, model=Product)
                self.repository = ProductRepository(session)

            # Add custom business logic here
            def list_products(self, **kwargs):
                return self.repository.list(**kwargs)
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

    def get_by_id(self, id: int, *, raise_404: bool = True) -> ModelType | None:
        """Get entity by ID.

        Args:
            id: Primary key of the entity
            raise_404: If True, raise HTTPException when not found

        Returns:
            Entity instance or None if not found and raise_404=False

        Raises:
            HTTPException: 404 if entity not found and raise_404=True
        """
        instance = self.db.get(self.model, id)
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

    def update(self, id: int, payload: UpdateSchemaType) -> ModelType:
        """Update existing entity.

        Args:
            id: Primary key of the entity to update
            payload: Pydantic schema with update data

        Returns:
            Updated entity instance

        Raises:
            HTTPException: 404 if entity not found, 409 if integrity constraint violated
        """
        instance = self.get_by_id(id)
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

    def delete(self, id: int) -> None:
        """Delete entity.

        Args:
            id: Primary key of the entity to delete

        Raises:
            HTTPException: 404 if entity not found
        """
        instance = self.get_by_id(id)
        self.db.delete(instance)
        self.db.commit()

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
