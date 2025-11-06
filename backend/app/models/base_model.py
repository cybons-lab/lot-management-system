# backend/app/models/base_model.py
"""
SQLAlchemy Base Model
共通のベースクラスと外部キー制約の設定
"""

import sqlite3

from sqlalchemy import Column, DateTime, Integer, String, event, func
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase


# SQLiteで外部キー制約を有効化
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # SQLite 接続のときだけ有効化
    if not isinstance(dbapi_connection, sqlite3.Connection):
        return
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


# 全てのモデルの基底クラス（SQLAlchemy 2.0準拠）
class Base(DeclarativeBase):
    """全モデルの基底クラス"""
    pass


class AuditMixin:
    """共通の監査カラムを提供するミックスイン"""

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(50), nullable=True)
    updated_by = Column(String(50), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    revision = Column(Integer, nullable=False, server_default="1", default=1)
