"""Shared schema components."""

from typing import TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.generics import GenericModel


class ORMModel(BaseModel):
    """Base model for ORM serialization."""

    model_config = ConfigDict(from_attributes=True)


class PageQuery(BaseModel):
    """Pagination and search parameters."""

    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=50, ge=1, le=500)
    q: str | None = None


T = TypeVar("T")


class Page[T](GenericModel):
    """Generic paginated response."""

    items: list[T]
    total: int
    page: int
    per_page: int
