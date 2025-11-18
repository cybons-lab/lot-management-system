#!/usr/bin/env python3
"""
Schema consistency checker: Compares DDL with SQLAlchemy models.

This script:
1. Parses DDL (PostgreSQL) to extract table and column definitions
2. Inspects SQLAlchemy models to extract table and column definitions
3. Generates a comprehensive diff report
4. Identifies high-priority issues (P0/P1/P2)
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))


def parse_ddl(ddl_path: Path) -> Dict[str, Dict[str, str]]:
    """
    Parse DDL file and extract table -> {column_name: column_definition} mapping.

    Returns:
        Dict[table_name, Dict[column_name, column_definition]]
    """
    tables = {}
    current_table = None
    current_columns = {}
    in_table_definition = False

    with open(ddl_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Detect CREATE TABLE
        if line.startswith('CREATE TABLE'):
            match = re.match(r'CREATE TABLE (?:public\.)?(\w+)', line)
            if match:
                if current_table and current_columns:
                    tables[current_table] = current_columns

                current_table = match.group(1)
                current_columns = {}
                in_table_definition = True

        # Parse column definitions
        elif in_table_definition and current_table:
            # End of table definition
            if line.startswith(');') or line.startswith('CONSTRAINT') or line.startswith('CHECK'):
                if current_table and current_columns:
                    tables[current_table] = current_columns
                in_table_definition = False
                current_table = None
                current_columns = {}
            else:
                # Column definition line
                # Format: column_name TYPE [constraints],
                col_match = re.match(r'(\w+)\s+(\w+(?:\([^)]+\))?)', line)
                if col_match:
                    col_name = col_match.group(1)
                    col_type = col_match.group(2)
                    current_columns[col_name] = f"{col_type} {line}"

        i += 1

    # Don't forget the last table
    if current_table and current_columns:
        tables[current_table] = current_columns

    return tables


def extract_model_definitions() -> Dict[str, Dict[str, str]]:
    """
    Extract table and column definitions from SQLAlchemy models.

    Returns:
        Dict[table_name, Dict[column_name, column_type]]
    """
    from app.models import (
        masters_models,
        orders_models,
        inventory_models,
        inbound_models,
        forecast_models,
        auth_models,
        logs_models,
        views_models,
        system_config_model,
        seed_snapshot_model,
    )

    model_modules = [
        masters_models,
        orders_models,
        inventory_models,
        inbound_models,
        forecast_models,
        auth_models,
        logs_models,
        views_models,
        system_config_model,
        seed_snapshot_model,
    ]

    tables = {}

    for module in model_modules:
        for attr_name in dir(module):
            attr = getattr(module, attr_name)

            # Check if it's a SQLAlchemy model
            if hasattr(attr, '__tablename__') and hasattr(attr, '__table__'):
                table_name = attr.__tablename__

                # Skip views
                if hasattr(attr, '__table_args__'):
                    table_args = attr.__table_args__
                    if isinstance(table_args, dict) and table_args.get('info', {}).get('is_view'):
                        continue

                columns = {}

                # Extract columns
                if hasattr(attr, '__table__'):
                    for col in attr.__table__.columns:
                        col_name = col.name
                        col_type = str(col.type)
                        columns[col_name] = col_type

                if table_name not in tables:
                    tables[table_name] = columns

    return tables


def compare_schemas(ddl_tables: Dict[str, Dict], model_tables: Dict[str, Dict]) -> Dict:
    """
    Compare DDL and model schemas and generate diff report.

    Returns:
        Dict with:
        - tables_only_in_ddl: List[str]
        - tables_only_in_models: List[str]
        - column_diffs: Dict[table_name, Dict[diff_type, List]]
    """
    ddl_table_names = set(ddl_tables.keys())
    model_table_names = set(model_tables.keys())

    tables_only_in_ddl = sorted(ddl_table_names - model_table_names)
    tables_only_in_models = sorted(model_table_names - ddl_table_names)

    column_diffs = {}

    # Compare columns for common tables
    common_tables = ddl_table_names & model_table_names

    for table in sorted(common_tables):
        ddl_cols = set(ddl_tables[table].keys())
        model_cols = set(model_tables[table].keys())

        cols_only_in_ddl = ddl_cols - model_cols
        cols_only_in_models = model_cols - ddl_cols

        if cols_only_in_ddl or cols_only_in_models:
            column_diffs[table] = {
                'ddl_only': sorted(cols_only_in_ddl),
                'model_only': sorted(cols_only_in_models),
            }

    return {
        'tables_only_in_ddl': tables_only_in_ddl,
        'tables_only_in_models': tables_only_in_models,
        'column_diffs': column_diffs,
    }


def generate_report(diff: Dict, ddl_tables: Dict, model_tables: Dict) -> str:
    """Generate markdown report from diff data."""

    report = []
    report.append("# Schema Consistency Check Report\n")
    report.append(f"**Generated:** {Path().cwd()}\n")
    report.append("---\n")

    # Summary
    report.append("## Summary\n")
    report.append(f"- **DDL tables:** {len(ddl_tables)}")
    report.append(f"- **Model tables:** {len(model_tables)}")
    report.append(f"- **Tables only in DDL:** {len(diff['tables_only_in_ddl'])}")
    report.append(f"- **Tables only in models:** {len(diff['tables_only_in_models'])}")
    report.append(f"- **Tables with column diffs:** {len(diff['column_diffs'])}\n")

    # Table-level diffs
    report.append("## 1. Table-Level Differences\n")

    report.append("### (A) Tables in DDL but not in Models\n")
    if diff['tables_only_in_ddl']:
        for table in diff['tables_only_in_ddl']:
            report.append(f"- `{table}`")
    else:
        report.append("*(None)*")
    report.append("")

    report.append("### (B) Tables in Models but not in DDL\n")
    if diff['tables_only_in_models']:
        for table in diff['tables_only_in_models']:
            report.append(f"- `{table}` ⚠️")
    else:
        report.append("*(None)*")
    report.append("")

    # Column-level diffs
    report.append("## 2. Column-Level Differences\n")

    if diff['column_diffs']:
        for table, cols in diff['column_diffs'].items():
            report.append(f"### Table: `{table}`\n")

            if cols['ddl_only']:
                report.append("**Columns in DDL only (not in model):**")
                for col in cols['ddl_only']:
                    col_def = ddl_tables[table].get(col, '(unknown)')
                    report.append(f"- `{col}` — {col_def}")
                report.append("")

            if cols['model_only']:
                report.append("**Columns in Model only (not in DDL):** ⚠️ **HIGH PRIORITY**")
                for col in cols['model_only']:
                    col_type = model_tables[table].get(col, '(unknown)')
                    report.append(f"- `{col}` — Type: `{col_type}`")
                report.append("")
    else:
        report.append("*(No column differences found)*\n")

    # Known problematic columns
    report.append("## 3. Known Problematic Columns\n")

    problematic = []

    # Check for deleted_at
    for table, cols in diff['column_diffs'].items():
        if 'deleted_at' in cols.get('model_only', []):
            problematic.append(f"- `{table}.deleted_at` (P0) — Model references deleted_at but DDL doesn't have it")

    # Check for *_code columns in wrong places
    suspicious_codes = []
    for table, cols in diff['column_diffs'].items():
        for col in cols.get('model_only', []):
            if col.endswith('_code') and table not in ['products', 'warehouses', 'customers', 'suppliers', 'delivery_places', 'roles']:
                suspicious_codes.append(f"- `{table}.{col}` (P1) — Possible legacy code column")

    if problematic:
        report.append("### P0: Critical (Will cause runtime errors)\n")
        report.extend(problematic)
        report.append("")

    if suspicious_codes:
        report.append("### P1: High Priority (Legacy columns)\n")
        report.extend(suspicious_codes)
        report.append("")

    if not problematic and not suspicious_codes:
        report.append("*(No known problematic patterns detected)*\n")

    return "\n".join(report)


def main():
    """Main execution."""

    # Paths
    repo_root = Path(__file__).parent.parent
    ddl_path = repo_root / "docs" / "schema" / "current" / "db_schema.sql"

    if not ddl_path.exists():
        print(f"Error: DDL file not found at {ddl_path}", file=sys.stderr)
        sys.exit(1)

    print("Parsing DDL...")
    ddl_tables = parse_ddl(ddl_path)
    print(f"  Found {len(ddl_tables)} tables in DDL")

    print("Extracting model definitions...")
    model_tables = extract_model_definitions()
    print(f"  Found {len(model_tables)} tables in models")

    print("Comparing schemas...")
    diff = compare_schemas(ddl_tables, model_tables)

    print("Generating report...")
    report = generate_report(diff, ddl_tables, model_tables)

    # Write report
    report_path = repo_root / "schema_consistency_report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n✅ Report written to: {report_path}")
    print("\nKey findings:")
    print(f"  - Tables only in DDL: {len(diff['tables_only_in_ddl'])}")
    print(f"  - Tables only in models: {len(diff['tables_only_in_models'])}")
    print(f"  - Tables with column diffs: {len(diff['column_diffs'])}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
