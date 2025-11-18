#!/usr/bin/env python3
"""
Schema consistency checker: Compares DDL with SQLAlchemy models.

This script:
1. Parses DDL (PostgreSQL) to extract table and column definitions
2. Parses model files directly (without importing) to extract definitions
3. Generates a comprehensive diff report
4. Identifies high-priority issues (P0/P1/P2)
"""

import re
from pathlib import Path
from typing import Dict, List, Set


def parse_ddl(ddl_path: Path) -> Dict[str, Set[str]]:
    """
    Parse DDL file and extract table -> {column_names} mapping.

    Returns:
        Dict[table_name, Set[column_name]]
    """
    tables = {}

    with open(ddl_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into individual CREATE TABLE statements
    table_statements = re.findall(
        r'CREATE TABLE (?:public\.)?(\w+)\s*\((.*?)\);',
        content,
        re.DOTALL | re.MULTILINE
    )

    for table_name, table_body in table_statements:
        columns = set()

        # Extract column names (first word on each line that starts with a letter)
        for line in table_body.split('\n'):
            line = line.strip()
            # Skip constraint lines
            if line.startswith('CONSTRAINT') or line.startswith('CHECK') or line.startswith('UNIQUE') or line.startswith('PRIMARY') or line.startswith('FOREIGN'):
                continue

            # Extract column name (first word)
            col_match = re.match(r'^(\w+)\s+', line)
            if col_match:
                col_name = col_match.group(1)
                # Skip SQL keywords
                if col_name.upper() not in ('CONSTRAINT', 'CHECK', 'UNIQUE', 'PRIMARY', 'FOREIGN', 'KEY', 'INDEX'):
                    columns.add(col_name)

        if columns:
            tables[table_name] = columns

    return tables


def parse_model_files(models_dir: Path) -> Dict[str, Set[str]]:
    """
    Parse model Python files and extract table -> {column_names} mapping.

    Returns:
        Dict[table_name, Set[column_name]]
    """
    tables = {}

    for model_file in models_dir.glob("*.py"):
        if model_file.name.startswith('__') or model_file.name == 'base_model.py':
            continue

        with open(model_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find all class definitions
        class_pattern = r'class\s+(\w+)\(Base\):.*?(?=class\s+\w+\(|$)'
        classes = re.findall(class_pattern, content, re.DOTALL)

        # For each class block, find __tablename__ and columns
        class_blocks = re.split(r'(?=^class\s+\w+\()', content, flags=re.MULTILINE)

        for block in class_blocks:
            if not block.strip():
                continue

            # Extract __tablename__
            tablename_match = re.search(r'__tablename__\s*=\s*["\'](\w+)["\']', block)
            if not tablename_match:
                continue

            table_name = tablename_match.group(1)

            # Skip views
            if '__table_args__' in block and '"is_view": True' in block:
                continue

            # Extract column definitions
            columns = set()

            # Pattern: name: Mapped[...] = mapped_column(...)
            # or: name = Column(...)
            # or: name = mapped_column(...)

            # mapped_column pattern
            mapped_col_pattern = r'(\w+):\s*Mapped\[.*?\]\s*=\s*mapped_column\('
            for match in re.finditer(mapped_col_pattern, block):
                columns.add(match.group(1))

            # Column pattern (old style)
            col_pattern = r'(\w+)\s*=\s*(?:Column|mapped_column)\('
            for match in re.finditer(col_pattern, block):
                col_name = match.group(1)
                # Skip if it's not a column (e.g., relationship)
                if 'relationship(' not in block[match.start():match.start() + 200]:
                    columns.add(col_name)

            if columns:
                tables[table_name] = columns

    return tables


def compare_schemas(ddl_tables: Dict[str, Set], model_tables: Dict[str, Set]) -> Dict:
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
        ddl_cols = ddl_tables[table]
        model_cols = model_tables[table]

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


def identify_priorities(diff: Dict) -> Dict[str, List[str]]:
    """
    Identify P0/P1/P2 issues.

    P0: Model-only columns that will cause runtime errors
    P1: Suspicious legacy columns
    P2: Design decisions needed
    """
    p0_issues = []
    p1_issues = []
    p2_issues = []

    # P0: Model-only columns (especially known problematic ones)
    known_problematic = ['deleted_at', 'customer_code', 'delivery_place_code', 'product_code']

    for table, cols in diff['column_diffs'].items():
        for col in cols.get('model_only', []):
            if col in known_problematic:
                p0_issues.append(f"`{table}.{col}` — Known legacy column, likely causes errors")
            elif col.endswith('_code') and table not in ['products', 'warehouses', 'customers', 'suppliers', 'delivery_places', 'roles']:
                p1_issues.append(f"`{table}.{col}` — Suspicious *_code column")
            else:
                p0_issues.append(f"`{table}.{col}` — Model-only column (may cause errors)")

    # P1: DDL-only columns (might be used in raw SQL)
    for table, cols in diff['column_diffs'].items():
        if cols.get('ddl_only'):
            p1_issues.append(f"`{table}` has {len(cols['ddl_only'])} DDL-only columns: {', '.join(sorted(cols['ddl_only']))}")

    return {
        'P0': p0_issues,
        'P1': p1_issues,
        'P2': p2_issues,
    }


def generate_report(diff: Dict, ddl_tables: Dict, model_tables: Dict, priorities: Dict) -> str:
    """Generate markdown report from diff data."""

    report = []
    report.append("# Schema Consistency Check Report\n")
    report.append("**Purpose:** Identify mismatches between DDL (source of truth) and SQLAlchemy models\n")
    report.append("---\n")

    # Summary
    report.append("## Summary\n")
    report.append(f"- **DDL tables:** {len(ddl_tables)}")
    report.append(f"- **Model tables:** {len(model_tables)}")
    report.append(f"- **Tables only in DDL:** {len(diff['tables_only_in_ddl'])}")
    report.append(f"- **Tables only in models:** {len(diff['tables_only_in_models'])}")
    report.append(f"- **Tables with column diffs:** {len(diff['column_diffs'])}")
    report.append(f"- **P0 issues (critical):** {len(priorities['P0'])}")
    report.append(f"- **P1 issues (high):** {len(priorities['P1'])}")
    report.append(f"- **P2 issues (medium):** {len(priorities['P2'])}\n")

    # Priority Issues
    report.append("## Priority Issues\n")

    if priorities['P0']:
        report.append("### P0: Critical — Will Cause Runtime Errors\n")
        report.append("These columns are referenced in models but don't exist in DDL.\n")
        for issue in priorities['P0']:
            report.append(f"- {issue}")
        report.append("")
    else:
        report.append("### P0: Critical\n")
        report.append("*(No P0 issues found)*\n")

    if priorities['P1']:
        report.append("### P1: High Priority — Likely Issues\n")
        report.append("These patterns suggest potential problems.\n")
        for issue in priorities['P1']:
            report.append(f"- {issue}")
        report.append("")
    else:
        report.append("### P1: High Priority\n")
        report.append("*(No P1 issues found)*\n")

    if priorities['P2']:
        report.append("### P2: Medium Priority — Design Decisions Needed\n")
        for issue in priorities['P2']:
            report.append(f"- {issue}")
        report.append("")

    # Table-level diffs
    report.append("## 1. Table-Level Differences\n")

    report.append("### (A) Tables in DDL but not in Models\n")
    if diff['tables_only_in_ddl']:
        for table in diff['tables_only_in_ddl']:
            cols = sorted(ddl_tables[table])
            report.append(f"- **`{table}`** — Columns: {', '.join(cols[:5])}{'...' if len(cols) > 5 else ''}")
    else:
        report.append("*(None)*")
    report.append("")

    report.append("### (B) Tables in Models but not in DDL ⚠️\n")
    if diff['tables_only_in_models']:
        for table in diff['tables_only_in_models']:
            cols = sorted(model_tables[table])
            report.append(f"- **`{table}`** — Columns: {', '.join(cols[:5])}{'...' if len(cols) > 5 else ''}")
    else:
        report.append("*(None)*")
    report.append("")

    # Column-level diffs
    report.append("## 2. Column-Level Differences\n")

    if diff['column_diffs']:
        for table in sorted(diff['column_diffs'].keys()):
            cols = diff['column_diffs'][table]
            report.append(f"### Table: `{table}`\n")

            if cols['ddl_only']:
                report.append("**📋 Columns in DDL only (not in model):**")
                for col in cols['ddl_only']:
                    report.append(f"- `{col}`")
                report.append("")

            if cols['model_only']:
                report.append("**⚠️ Columns in Model only (NOT in DDL):** — **HIGH PRIORITY**")
                for col in cols['model_only']:
                    report.append(f"- `{col}`")
                report.append("")
    else:
        report.append("*(No column differences found)*\n")

    # Recommendations
    report.append("## Recommendations\n")
    report.append("1. **Fix P0 issues immediately** — These will cause SQL errors")
    report.append("2. **Review P1 issues** — Check for raw SQL queries using DDL-only columns")
    report.append("3. **Decide on P2 issues** — Determine if columns should be added to DDL or removed from models")
    report.append("4. **Update models to match DDL** — DDL is the single source of truth\n")

    return "\n".join(report)


def main():
    """Main execution."""

    # Paths
    repo_root = Path(__file__).parent.parent
    # Use the v2.2_id DDL which uses 'id' for primary keys (matches models)
    ddl_path = repo_root / "docs" / "schema" / "base" / "lot_management_ddl_v2_2_id.sql"
    models_dir = repo_root / "backend" / "app" / "models"

    if not ddl_path.exists():
        print(f"Error: DDL file not found at {ddl_path}")
        return 1

    if not models_dir.exists():
        print(f"Error: Models directory not found at {models_dir}")
        return 1

    print("📊 Schema Consistency Check")
    print("=" * 60)
    print(f"DDL file: {ddl_path}")
    print(f"Models dir: {models_dir}\n")

    print("Step 1/5: Parsing DDL...")
    ddl_tables = parse_ddl(ddl_path)
    print(f"  ✅ Found {len(ddl_tables)} tables in DDL")

    print("Step 2/5: Parsing model files...")
    model_tables = parse_model_files(models_dir)
    print(f"  ✅ Found {len(model_tables)} tables in models")

    print("Step 3/5: Comparing schemas...")
    diff = compare_schemas(ddl_tables, model_tables)
    print(f"  ✅ Comparison complete")

    print("Step 4/5: Identifying priorities...")
    priorities = identify_priorities(diff)
    print(f"  ✅ Found {len(priorities['P0'])} P0, {len(priorities['P1'])} P1, {len(priorities['P2'])} P2 issues")

    print("Step 5/5: Generating report...")
    report = generate_report(diff, ddl_tables, model_tables, priorities)

    # Write report
    report_path = repo_root / "schema_consistency_report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n✅ Report written to: {report_path}")
    print("\n📈 Summary:")
    print(f"  - P0 (Critical): {len(priorities['P0'])} issues")
    print(f"  - P1 (High): {len(priorities['P1'])} issues")
    print(f"  - P2 (Medium): {len(priorities['P2'])} issues")
    print(f"  - Tables with diffs: {len(diff['column_diffs'])}")

    if priorities['P0']:
        print("\n⚠️  CRITICAL: P0 issues found! These will cause runtime errors.")
        print("    Review the report and fix immediately.")

    return 0


if __name__ == "__main__":
    exit(main())
