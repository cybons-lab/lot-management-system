"""Database schema inspection API.

Provides endpoints to dynamically generate ER diagram data from SQLAlchemy models.
"""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models.base_model import Base


router = APIRouter(prefix="/schema", tags=["schema"])


@router.get("/tables")
def get_tables(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get all tables with their columns and relationships.

    Returns:
        Dictionary with table metadata including columns, relationships, and comments.
    """
    tables = []

    # Get all mapped classes
    for mapper in Base.registry.mappers:
        table = mapper.class_.__table__
        table_name = table.name

        # Get table comment
        table_comment = table.comment or ""

        # Get columns
        columns = []
        for column in table.columns:
            col_info = {
                "name": column.name,
                "type": str(column.type),
                "nullable": column.nullable,
                "primary_key": column.primary_key,
                "foreign_key": None,
                "comment": column.comment or "",
            }

            # Check for foreign keys
            if column.foreign_keys:
                fk = list(column.foreign_keys)[0]
                col_info["foreign_key"] = {
                    "table": fk.column.table.name,
                    "column": fk.column.name,
                }

            columns.append(col_info)

        # Get relationships
        relationships = []
        for rel_name, rel in mapper.relationships.items():
            rel_info = {
                "name": rel_name,
                "target_table": rel.target.name,
                "direction": rel.direction.name,
                "uselist": rel.uselist,
            }
            relationships.append(rel_info)

        tables.append(
            {
                "name": table_name,
                "comment": table_comment,
                "columns": columns,
                "relationships": relationships,
            }
        )

    return {"tables": tables}


@router.get("/mermaid")
def get_mermaid_er_diagram(db: Session = Depends(get_db)) -> dict[str, str]:
    """Generate Mermaid ER diagram syntax (simplified for large schemas).

    Returns:
        Dictionary with 'diagram' key containing Mermaid syntax string.
    """
    lines = ["erDiagram"]
    tables_added = set()

    # Only show relationships, not detailed columns (to avoid text size limit)
    for mapper in Base.registry.mappers:
        table = mapper.class_.__table__
        table_name = table.name

        # Add table definition (empty, just for visualization)
        if table_name not in tables_added:
            comment = table.comment or table_name
            lines.append(f"    {table_name} {{")
            lines.append(f'        string comment "{comment[:30]}"')
            lines.append("    }")
            tables_added.add(table_name)

        # Add relationships
        for column in table.columns:
            if column.foreign_keys:
                fk = list(column.foreign_keys)[0]
                target_table = fk.column.table.name

                # Ensure target table is defined
                if target_table not in tables_added:
                    lines.append(f"    {target_table} {{")
                    lines.append("        string id")
                    lines.append("    }")
                    tables_added.add(target_table)

                # Add relationship
                lines.append(f'    {target_table} ||--o{{ {table_name} : "{column.name}"')

    diagram = "\n".join(lines)
    return {"diagram": diagram}
