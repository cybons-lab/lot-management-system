"""Database package for backward compatible imports."""

from app.core.database import SessionLocal

__all__ = ["SessionLocal"]
