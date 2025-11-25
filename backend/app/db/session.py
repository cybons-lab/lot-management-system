"""Compatibility layer for legacy ``app.db.session`` imports."""

from app.core.database import SessionLocal, drop_db, engine, get_db, init_db
from app.models.base_model import Base


__all__ = [
    "SessionLocal",
    "engine",
    "Base",
    "get_db",
    "init_db",
    "drop_db",
]
