"""DB browser debug endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import quoted_name

from app.core.config import settings
from app.core.database import get_db
from app.presentation.api.routes.auth.auth_router import get_current_admin


router = APIRouter(prefix="/debug/db", tags=["debug-db"])


MAX_LIMIT = 200
DEFAULT_LIMIT = 50
MAX_Q_COLUMNS = 3
STATEMENT_TIMEOUT_MS = 3_000


def _ensure_enabled() -> None:
    if not settings.ENABLE_DB_BROWSER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DB browser is disabled",
        )


def _get_allowed_schemas(db: Session) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT nspname
            FROM pg_namespace
            WHERE nspname NOT IN ('pg_catalog', 'information_schema')
              AND nspname NOT LIKE 'pg_%'
            ORDER BY nspname
            """
        )
    ).fetchall()
    return [row[0] for row in rows]


def _validate_schema(schema: str, allowed: list[str]) -> None:
    if schema not in allowed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schema not found")


def _fetch_allowed_columns(db: Session, schema: str, name: str) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :name
            ORDER BY ordinal_position
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()
    return [row[0] for row in rows]


def _safe_identifier(value: str) -> str:
    return str(quoted_name(value, True))


@router.get("/objects")
def list_db_objects(
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> list[dict[str, Any]]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)
    rows = db.execute(
        text(
            """
            SELECT
              n.nspname AS schema_name,
              c.relname AS object_name,
              CASE c.relkind
                WHEN 'r' THEN 'table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized_view'
              END AS object_type,
              obj_description(c.oid, 'pg_class') AS comment,
              c.reltuples::bigint AS row_estimate
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = ANY(:schemas)
              AND c.relkind IN ('r', 'v', 'm')
            ORDER BY n.nspname, c.relname
            """
        ),
        {"schemas": allowed_schemas},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


@router.get("/objects/{schema}/{name}/schema")
def get_object_schema(
    schema: str,
    name: str,
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> dict[str, Any]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)
    _validate_schema(schema, allowed_schemas)

    columns = db.execute(
        text(
            """
            SELECT
              cols.column_name,
              cols.data_type,
              cols.is_nullable,
              cols.column_default,
              cols.character_maximum_length AS char_max_length,
              cols.numeric_precision,
              cols.numeric_scale,
              col_description(c.oid, cols.ordinal_position) AS comment
            FROM information_schema.columns cols
            JOIN pg_class c ON c.relname = cols.table_name
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE cols.table_schema = :schema
              AND cols.table_name = :name
              AND n.nspname = :schema
            ORDER BY cols.ordinal_position
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()
    if not columns:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    constraints = db.execute(
        text(
            """
            SELECT
              con.conname AS constraint_name,
              con.contype AS constraint_type,
              ARRAY_AGG(att.attname ORDER BY att.attnum) AS columns,
              fn.nspname AS foreign_schema,
              fc.relname AS foreign_table,
              ARRAY_AGG(fa.attname ORDER BY fa.attnum) AS foreign_columns
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = rel.relnamespace
            LEFT JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
            LEFT JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
            LEFT JOIN pg_class fc ON fc.oid = con.confrelid
            LEFT JOIN pg_namespace fn ON fn.oid = fc.relnamespace
            LEFT JOIN unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
            LEFT JOIN pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = fcols.attnum
            WHERE n.nspname = :schema
              AND rel.relname = :name
              AND con.contype IN ('p', 'u', 'f')
            GROUP BY
              con.conname,
              con.contype,
              fn.nspname,
              fc.relname
            ORDER BY con.conname
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    indexes = db.execute(
        text(
            """
            SELECT
              i.relname AS index_name,
              ix.indisunique AS unique,
              am.amname AS method,
              ARRAY_AGG(att.attname ORDER BY cols.ord) AS columns
            FROM pg_index ix
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_am am ON am.oid = i.relam
            LEFT JOIN unnest(ix.indkey) WITH ORDINALITY AS cols(attnum, ord) ON true
            LEFT JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = cols.attnum
            WHERE n.nspname = :schema
              AND t.relname = :name
            GROUP BY i.relname, ix.indisunique, am.amname
            ORDER BY i.relname
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    primary_keys = [
        row["columns"]
        for row in constraints
        if row["constraint_type"] == "p" and row["columns"]
    ]
    primary_key_columns = primary_keys[0] if primary_keys else []

    return {
        "columns": [dict(row._mapping) for row in columns],
        "constraints": [dict(row._mapping) for row in constraints],
        "indexes": [dict(row._mapping) for row in indexes],
        "primary_key_columns": primary_key_columns,
    }


@router.get("/objects/{schema}/{name}/rows")
def get_object_rows(
    schema: str,
    name: str,
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    order_by: str | None = None,
    order_dir: str = Query("asc", pattern="^(?i)(asc|desc)$"),
    q: str | None = None,
    filters: list[str] | None = Query(None),
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> dict[str, Any]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)
    _validate_schema(schema, allowed_schemas)

    column_names = _fetch_allowed_columns(db, schema, name)
    if not column_names:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    if order_by is None:
        schema_info = get_object_schema(schema, name, db, _current_admin)
        if schema_info["primary_key_columns"]:
            order_by = schema_info["primary_key_columns"][0]
        else:
            order_by = column_names[0]

    if order_by not in column_names:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order_by")

    filter_map: dict[str, str] = {}
    if filters:
        for item in filters:
            if "=" not in item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid filter format",
                )
            key, value = item.split("=", 1)
            if key not in column_names:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid filter column: {key}",
                )
            filter_map[key] = value

    text_columns = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :name
              AND data_type IN ('character varying', 'character', 'text', 'citext')
            ORDER BY ordinal_position
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()
    searchable_columns = [row[0] for row in text_columns][:MAX_Q_COLUMNS]

    where_clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    for idx, (key, value) in enumerate(filter_map.items()):
        clause = f"{_safe_identifier(key)} = :filter_{idx}"
        where_clauses.append(clause)
        params[f"filter_{idx}"] = value

    if q and searchable_columns:
        search_clauses = []
        params["search_query"] = f"%{q}%"
        for idx, col in enumerate(searchable_columns):
            search_clauses.append(f"{_safe_identifier(col)} ILIKE :search_query")
        where_clauses.append("(" + " OR ".join(search_clauses) + ")")

    where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    column_projection = ", ".join(_safe_identifier(col) for col in column_names)
    order_clause = f" ORDER BY {_safe_identifier(order_by)} {order_dir.upper()}"

    db.execute(text("SET statement_timeout = :timeout_ms"), {"timeout_ms": STATEMENT_TIMEOUT_MS})
    try:
        sql = (
            f"SELECT {column_projection} FROM {_safe_identifier(schema)}.{_safe_identifier(name)}"
            f"{where_sql}{order_clause} LIMIT :limit OFFSET :offset"
        )

        rows = db.execute(text(sql), params).fetchall()
    finally:
        db.execute(text("SET statement_timeout = DEFAULT"))

    columns = [
        {"name": col["column_name"], "type": col["data_type"]}
        for col in db.execute(
            text(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = :schema
                  AND table_name = :name
                ORDER BY ordinal_position
                """
            ),
            {"schema": schema, "name": name},
        ).fetchall()
    ]

    total_estimate = None
    if len(rows) == limit:
        total_estimate = offset + limit + 1
    else:
        total_estimate = offset + len(rows)

    return {
        "columns": columns,
        "rows": [dict(row._mapping) for row in rows],
        "total_estimate": total_estimate,
    }


@router.get("/objects/{schema}/{name}/definition")
def get_view_definition(
    schema: str,
    name: str,
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> dict[str, Any]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)
    _validate_schema(schema, allowed_schemas)

    row = db.execute(
        text(
            """
            SELECT
              c.relkind,
              pg_get_viewdef(c.oid, true) AS definition
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = :schema
              AND c.relname = :name
              AND c.relkind IN ('v', 'm')
            """
        ),
        {"schema": schema, "name": name},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="View not found")

    return {"definition_sql": row._mapping["definition"]}


@router.get("/graph")
def get_db_graph(
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> dict[str, Any]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)

    nodes = db.execute(
        text(
            """
            SELECT
              n.nspname AS schema,
              c.relname AS name,
              CASE c.relkind
                WHEN 'r' THEN 'table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized_view'
              END AS type
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = ANY(:schemas)
              AND c.relkind IN ('r', 'v', 'm')
            ORDER BY n.nspname, c.relname
            """
        ),
        {"schemas": allowed_schemas},
    ).fetchall()
    node_list = [
        {"id": f"{row.schema}.{row.name}", "schema": row.schema, "name": row.name, "type": row.type}
        for row in nodes
    ]

    fk_rows = db.execute(
        text(
            """
            SELECT
              src_ns.nspname AS src_schema,
              src.relname AS src_table,
              dst_ns.nspname AS dst_schema,
              dst.relname AS dst_table,
              ARRAY_AGG(src_attr.attname ORDER BY cols.ord) AS src_columns,
              ARRAY_AGG(dst_attr.attname ORDER BY cols.ord) AS dst_columns
            FROM pg_constraint con
            JOIN pg_class src ON src.oid = con.conrelid
            JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
            JOIN pg_class dst ON dst.oid = con.confrelid
            JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
            JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
            JOIN pg_attribute src_attr ON src_attr.attrelid = src.oid AND src_attr.attnum = cols.attnum
            JOIN unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
            JOIN pg_attribute dst_attr ON dst_attr.attrelid = dst.oid AND dst_attr.attnum = fcols.attnum
            WHERE con.contype = 'f'
              AND src_ns.nspname = ANY(:schemas)
              AND dst_ns.nspname = ANY(:schemas)
            GROUP BY src_ns.nspname, src.relname, dst_ns.nspname, dst.relname
            ORDER BY src_ns.nspname, src.relname
            """
        ),
        {"schemas": allowed_schemas},
    ).fetchall()

    fk_edges = [
        {
            "type": "fk",
            "from": f"{row.src_schema}.{row.src_table}",
            "to": f"{row.dst_schema}.{row.dst_table}",
            "columns": list(zip(row.src_columns, row.dst_columns, strict=True)),
        }
        for row in fk_rows
    ]

    dep_rows = db.execute(
        text(
            """
            SELECT
              view_ns.nspname AS view_schema,
              view_cls.relname AS view_name,
              ref_ns.nspname AS ref_schema,
              ref_cls.relname AS ref_name,
              ref_cls.relkind AS ref_kind
            FROM pg_rewrite rw
            JOIN pg_class view_cls ON view_cls.oid = rw.ev_class
            JOIN pg_namespace view_ns ON view_ns.oid = view_cls.relnamespace
            JOIN pg_depend dep ON dep.objid = rw.oid
            JOIN pg_class ref_cls ON ref_cls.oid = dep.refobjid
            JOIN pg_namespace ref_ns ON ref_ns.oid = ref_cls.relnamespace
            WHERE view_cls.relkind IN ('v', 'm')
              AND ref_cls.relkind IN ('r', 'v', 'm')
              AND view_ns.nspname = ANY(:schemas)
              AND ref_ns.nspname = ANY(:schemas)
            """
        ),
        {"schemas": allowed_schemas},
    ).fetchall()

    view_edges = [
        {
            "type": "view_dependency",
            "from": f"{row.view_schema}.{row.view_name}",
            "to": f"{row.ref_schema}.{row.ref_name}",
            "ref_type": "table" if row.ref_kind == "r" else "view",
        }
        for row in dep_rows
    ]

    return {"nodes": node_list, "edges": fk_edges + view_edges}


@router.get("/objects/{schema}/{name}/relations")
def get_object_relations(
    schema: str,
    name: str,
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
) -> dict[str, Any]:
    _ensure_enabled()
    allowed_schemas = _get_allowed_schemas(db)
    _validate_schema(schema, allowed_schemas)

    fk_rows = db.execute(
        text(
            """
            SELECT
              con.conname AS constraint_name,
              src_ns.nspname AS src_schema,
              src.relname AS src_table,
              dst_ns.nspname AS dst_schema,
              dst.relname AS dst_table,
              ARRAY_AGG(src_attr.attname ORDER BY cols.ord) AS src_columns,
              ARRAY_AGG(dst_attr.attname ORDER BY cols.ord) AS dst_columns
            FROM pg_constraint con
            JOIN pg_class src ON src.oid = con.conrelid
            JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
            JOIN pg_class dst ON dst.oid = con.confrelid
            JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
            JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
            JOIN pg_attribute src_attr ON src_attr.attrelid = src.oid AND src_attr.attnum = cols.attnum
            JOIN unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
            JOIN pg_attribute dst_attr ON dst_attr.attrelid = dst.oid AND dst_attr.attnum = fcols.attnum
            WHERE con.contype = 'f'
              AND src_ns.nspname = :schema
              AND src.relname = :name
            GROUP BY con.conname, src_ns.nspname, src.relname, dst_ns.nspname, dst.relname
            ORDER BY con.conname
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    incoming_fk_rows = db.execute(
        text(
            """
            SELECT
              con.conname AS constraint_name,
              src_ns.nspname AS src_schema,
              src.relname AS src_table,
              dst_ns.nspname AS dst_schema,
              dst.relname AS dst_table,
              ARRAY_AGG(src_attr.attname ORDER BY cols.ord) AS src_columns,
              ARRAY_AGG(dst_attr.attname ORDER BY cols.ord) AS dst_columns
            FROM pg_constraint con
            JOIN pg_class src ON src.oid = con.conrelid
            JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
            JOIN pg_class dst ON dst.oid = con.confrelid
            JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
            JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
            JOIN pg_attribute src_attr ON src_attr.attrelid = src.oid AND src_attr.attnum = cols.attnum
            JOIN unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
            JOIN pg_attribute dst_attr ON dst_attr.attrelid = dst.oid AND dst_attr.attnum = fcols.attnum
            WHERE con.contype = 'f'
              AND dst_ns.nspname = :schema
              AND dst.relname = :name
            GROUP BY con.conname, src_ns.nspname, src.relname, dst_ns.nspname, dst.relname
            ORDER BY con.conname
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    view_deps = db.execute(
        text(
            """
            SELECT
              view_ns.nspname AS view_schema,
              view_cls.relname AS view_name,
              ref_ns.nspname AS ref_schema,
              ref_cls.relname AS ref_name,
              ref_cls.relkind AS ref_kind
            FROM pg_rewrite rw
            JOIN pg_class view_cls ON view_cls.oid = rw.ev_class
            JOIN pg_namespace view_ns ON view_ns.oid = view_cls.relnamespace
            JOIN pg_depend dep ON dep.objid = rw.oid
            JOIN pg_class ref_cls ON ref_cls.oid = dep.refobjid
            JOIN pg_namespace ref_ns ON ref_ns.oid = ref_cls.relnamespace
            WHERE view_cls.relkind IN ('v', 'm')
              AND ref_cls.relkind IN ('r', 'v', 'm')
              AND view_ns.nspname = :schema
              AND view_cls.relname = :name
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    view_backrefs = db.execute(
        text(
            """
            SELECT
              view_ns.nspname AS view_schema,
              view_cls.relname AS view_name,
              ref_ns.nspname AS ref_schema,
              ref_cls.relname AS ref_name,
              ref_cls.relkind AS ref_kind
            FROM pg_rewrite rw
            JOIN pg_class view_cls ON view_cls.oid = rw.ev_class
            JOIN pg_namespace view_ns ON view_ns.oid = view_cls.relnamespace
            JOIN pg_depend dep ON dep.objid = rw.oid
            JOIN pg_class ref_cls ON ref_cls.oid = dep.refobjid
            JOIN pg_namespace ref_ns ON ref_ns.oid = ref_cls.relnamespace
            WHERE view_cls.relkind IN ('v', 'm')
              AND ref_cls.relkind IN ('r', 'v', 'm')
              AND ref_ns.nspname = :schema
              AND ref_cls.relname = :name
            """
        ),
        {"schema": schema, "name": name},
    ).fetchall()

    def _format_fk(rows: list[Any]) -> list[dict[str, Any]]:
        return [
            {
                "constraint_name": row.constraint_name,
                "from": f"{row.src_schema}.{row.src_table}",
                "to": f"{row.dst_schema}.{row.dst_table}",
                "columns": list(zip(row.src_columns, row.dst_columns, strict=True)),
            }
            for row in rows
        ]

    return {
        "outgoing_fks": _format_fk(fk_rows),
        "incoming_fks": _format_fk(incoming_fk_rows),
        "view_dependencies": [
            {
                "from": f"{row.view_schema}.{row.view_name}",
                "to": f"{row.ref_schema}.{row.ref_name}",
                "ref_type": "table" if row.ref_kind == "r" else "view",
            }
            for row in view_deps
        ],
        "view_dependents": [
            {
                "from": f"{row.view_schema}.{row.view_name}",
                "to": f"{row.ref_schema}.{row.ref_name}",
                "ref_type": "table" if row.ref_kind == "r" else "view",
            }
            for row in view_backrefs
        ],
    }
