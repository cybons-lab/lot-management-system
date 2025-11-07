"""Compatibility layer for legacy ``app.db.session`` imports."""

from app.core.database import SessionLocal, engine, Base, get_db, init_db, drop_db

__all__ = [
    "SessionLocal",
    "engine",
    "Base",
    "get_db",
    "init_db",
    "drop_db",
]
