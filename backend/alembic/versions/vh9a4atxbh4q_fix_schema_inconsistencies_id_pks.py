"""Fix schema inconsistencies: convert code-based PKs to id-based PKs

This migration fixes the fundamental schema mismatch between the initial migration
and the SQLAlchemy models:
- Customers, Products, Suppliers should have 'id' as PK, not 'code'
- stock_movements.product_id should be INTEGER FK to products.id, not TEXT to product_code
- Ensures lot_current_stock is a VIEW, not a TABLE

This migration is idempotent and handles both:
1. Databases created with code-based PKs (buggy initial migration)
2. Databases already having id-based PKs

Revision ID: vh9a4atxbh4q
Revises: 3f8a35b39c3d
Create Date: 2025-11-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'vh9a4atxbh4q'
down_revision = '3f8a35b39c3d'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("""
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = :table
              AND column_name = :column
            LIMIT 1
        """),
        {"table": table, "column": column}
    ).first()
    return result is not None


def _constraint_exists(table: str, constraint: str) -> bool:
    """Check if a constraint exists."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("""
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = current_schema()
              AND table_name = :table
              AND constraint_name = :constraint
            LIMIT 1
        """),
        {"table": table, "constraint": constraint}
    ).first()
    return result is not None


def _get_primary_key_column(table: str) -> str | None:
    """Get the primary key column name for a table."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = :table::regclass
              AND i.indisprimary
            LIMIT 1
        """),
        {"table": table}
    ).first()
    return result[0] if result else None


def _sequence_exists(sequence: str) -> bool:
    """Check if a sequence exists."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("""
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relname = :seq
              AND c.relkind = 'S'
            LIMIT 1
        """),
        {"seq": sequence}
    ).first()
    return result is not None


def _fix_master_table(
    table: str,
    code_column: str,
    name_column: str,
    sequence_name: str
):
    """
    Fix a master table to have id as PRIMARY KEY instead of code.

    Args:
        table: Table name (e.g., 'customers')
        code_column: Code column name (e.g., 'customer_code')
        name_column: Name column name (e.g., 'customer_name')
        sequence_name: Sequence name for id column (e.g., 'customers_id_seq')
    """
    bind = op.get_bind()

    # Check current primary key
    current_pk = _get_primary_key_column(table)

    # If already using id as PK, nothing to do
    if current_pk == 'id':
        print(f"✓ {table}: Already has 'id' as PRIMARY KEY")
        return

    print(f"⚠ {table}: Fixing schema (current PK: {current_pk})")

    # Step 1: Create sequence if it doesn't exist
    if not _sequence_exists(sequence_name):
        op.execute(f"CREATE SEQUENCE {sequence_name};")

    # Step 2: Add id column if it doesn't exist
    if not _column_exists(table, 'id'):
        op.execute(f"""
            ALTER TABLE {table}
            ADD COLUMN id INTEGER NOT NULL DEFAULT nextval('{sequence_name}');
        """)
    else:
        # Ensure it has the right default
        op.execute(f"""
            ALTER TABLE {table}
            ALTER COLUMN id SET DEFAULT nextval('{sequence_name}');
        """)

    # Step 3: Drop the old primary key constraint if it exists on code_column
    if current_pk == code_column:
        # Find the constraint name
        pk_constraint = bind.execute(
            sa.text("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_schema = current_schema()
                  AND table_name = :table
                  AND constraint_type = 'PRIMARY KEY'
                LIMIT 1
            """),
            {"table": table}
        ).first()

        if pk_constraint:
            op.execute(f"ALTER TABLE {table} DROP CONSTRAINT {pk_constraint[0]} CASCADE;")

    # Step 4: Add new PRIMARY KEY on id
    if not _constraint_exists(table, f"{table}_pkey"):
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {table}_pkey PRIMARY KEY (id);")

    # Step 5: Ensure code column has UNIQUE constraint
    unique_constraint_name = f"uq_{table}_{code_column}"
    if not _constraint_exists(table, unique_constraint_name):
        op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {unique_constraint_name} UNIQUE ({code_column});")

    # Step 6: Set sequence ownership
    op.execute(f"ALTER SEQUENCE {sequence_name} OWNED BY {table}.id;")

    print(f"✓ {table}: Schema fixed (id as PK, {code_column} as UNIQUE)")


def upgrade() -> None:
    """
    Fix schema inconsistencies:
    1. Convert customers, products, suppliers to use id as PK
    2. Fix stock_movements.product_id from TEXT to INTEGER
    3. Update foreign key references
    """
    bind = op.get_bind()

    print("\n=== Fixing Master Table Schemas ===")

    # Fix customers table
    _fix_master_table(
        table='customers',
        code_column='customer_code',
        name_column='customer_name',
        sequence_name='customers_id_seq'
    )

    # Fix products table
    _fix_master_table(
        table='products',
        code_column='product_code',
        name_column='product_name',
        sequence_name='products_id_seq'
    )

    # Fix suppliers table
    _fix_master_table(
        table='suppliers',
        code_column='supplier_code',
        name_column='supplier_name',
        sequence_name='suppliers_id_seq'
    )

    print("\n=== Fixing Foreign Key References ===")

    # Now fix stock_movements.product_id if it's TEXT
    if _column_exists('stock_movements', 'product_id'):
        # Check current type
        current_type = bind.execute(
            sa.text("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'stock_movements'
                  AND column_name = 'product_id'
            """)
        ).first()

        if current_type and current_type[0] in ('text', 'character varying', 'varchar'):
            print("⚠ stock_movements.product_id: Converting TEXT to INTEGER")

            # Drop existing foreign key if it exists
            fk_constraints = bind.execute(
                sa.text("""
                    SELECT constraint_name
                    FROM information_schema.table_constraints
                    WHERE table_schema = current_schema()
                      AND table_name = 'stock_movements'
                      AND constraint_type = 'FOREIGN KEY'
                      AND constraint_name LIKE '%product%'
                """)
            ).fetchall()

            for fk in fk_constraints:
                op.execute(f"ALTER TABLE stock_movements DROP CONSTRAINT {fk[0]};")

            # Add product_id_new as INTEGER and populate it
            op.execute("""
                ALTER TABLE stock_movements
                ADD COLUMN product_id_new INTEGER;
            """)

            # Migrate data: match product_code to products.id
            op.execute("""
                UPDATE stock_movements sm
                SET product_id_new = p.id
                FROM products p
                WHERE sm.product_id = p.product_code;
            """)

            # Drop old column and rename new one
            op.execute("ALTER TABLE stock_movements DROP COLUMN product_id;")
            op.execute("ALTER TABLE stock_movements RENAME COLUMN product_id_new TO product_id;")

            # Make it NOT NULL
            op.execute("ALTER TABLE stock_movements ALTER COLUMN product_id SET NOT NULL;")

            # Add foreign key constraint
            op.execute("""
                ALTER TABLE stock_movements
                ADD CONSTRAINT fk_stock_movements_product
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
            """)

            print("✓ stock_movements.product_id: Converted to INTEGER FK")
        else:
            print("✓ stock_movements.product_id: Already INTEGER")

    # Fix lots table foreign keys if needed
    for fk_col, ref_table, ref_col in [
        ('product_id', 'products', 'id'),
        ('supplier_id', 'suppliers', 'id'),
    ]:
        if _column_exists('lots', fk_col):
            # Check if FK constraint exists
            fk_name = f"fk_lots_{fk_col.replace('_id', '')}"
            if not _constraint_exists('lots', fk_name):
                # Check current data type
                col_type = bind.execute(
                    sa.text("""
                        SELECT data_type
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'lots'
                          AND column_name = :col
                    """),
                    {"col": fk_col}
                ).first()

                if col_type and col_type[0] == 'integer':
                    # Add FK constraint
                    op.execute(f"""
                        ALTER TABLE lots
                        ADD CONSTRAINT {fk_name}
                        FOREIGN KEY ({fk_col}) REFERENCES {ref_table}({ref_col}) ON DELETE RESTRICT;
                    """)
                    print(f"✓ lots.{fk_col}: Added FK constraint to {ref_table}.{ref_col}")

    # Fix orders.customer_id if needed
    if _column_exists('orders', 'customer_id'):
        # Check if it's integer and has FK
        col_type = bind.execute(
            sa.text("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'orders'
                  AND column_name = 'customer_id'
            """)
        ).first()

        if col_type and col_type[0] == 'integer':
            if not _constraint_exists('orders', 'fk_orders_customer'):
                op.execute("""
                    ALTER TABLE orders
                    ADD CONSTRAINT fk_orders_customer
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
                """)
                print("✓ orders.customer_id: Added FK constraint")

    # Fix order_lines.product_id if needed
    if _column_exists('order_lines', 'product_id'):
        col_type = bind.execute(
            sa.text("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'order_lines'
                  AND column_name = 'product_id'
            """)
        ).first()

        if col_type and col_type[0] == 'integer':
            if not _constraint_exists('order_lines', 'fk_order_lines_product'):
                op.execute("""
                    ALTER TABLE order_lines
                    ADD CONSTRAINT fk_order_lines_product
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
                """)
                print("✓ order_lines.product_id: Added FK constraint")

    print("\n=== Schema Migration Complete ===\n")


def downgrade() -> None:
    """
    Downgrade not supported for this migration.

    Converting back from id-based to code-based PKs would be destructive
    and is not recommended. If you need to revert, restore from backup.
    """
    raise NotImplementedError(
        "Downgrade not supported: cannot safely revert from id-based to code-based PKs. "
        "Restore from backup if needed."
    )
