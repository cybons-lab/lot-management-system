# backend/scripts/model_schema_dump.py
"""
Dump SQLAlchemy models' DDL as PostgreSQL SQL.
- Outputs CREATE TABLE / CREATE INDEX statements for all models.
- Respects DATABASE_URL env for dialect and naming.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

# プロジェクトに合わせて Base をまとめて import
# app/models/__init__.py で Base を再エクスポートしている前提
from app.infrastructure.persistence.models.base_model import Base  # ここが異なる場合は適宜修正


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL is not set")

engine = create_engine(DATABASE_URL, future=True)

ddl_sql: list[str] = []

# CREATE TABLE
for table in Base.metadata.sorted_tables:
    stmt = CreateTable(table).compile(dialect=postgresql.dialect())
    ddl_sql.append(str(stmt).rstrip() + ";\n")

# CREATE INDEX
seen_indexes = set()
for table in Base.metadata.sorted_tables:
    for idx in table.indexes:
        # (name, table) で重複回避
        key = (idx.name, table.name)
        if key in seen_indexes:
            continue
        seen_indexes.add(key)
        stmt = CreateIndex(idx).compile(dialect=postgresql.dialect())
        ddl_sql.append(str(stmt).rstrip() + ";\n")

print("\n".join(ddl_sql))
