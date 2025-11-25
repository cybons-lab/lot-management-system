# backend/app/models/base_model.py
"""SQLAlchemy declarative base utilities."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    pass
