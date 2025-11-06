"""Add delivery places master and per-destination columns.

Revision ID: 711c8f038ab9
Revises: 0c1de9b8a6e7
Create Date: 2025-11-06 02:18:54.913369

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = "711c8f038ab9"
down_revision = "0c1de9b8a6e7"
branch_labels = None
depends_on = None


def _table_has_column(inspector: Inspector, table: str, column: str) -> bool:
    return column in {col["name"] for col in inspector.get_columns(table)}


def _constraint_names(inspector: Inspector, table: str, kind: str) -> set[str]:
    if kind == "unique":
        return {uc["name"] for uc in inspector.get_unique_constraints(table)}
    if kind == "foreign":
        return {fk["name"] for fk in inspector.get_foreign_keys(table)}
    if kind == "index":
        return {idx["name"] for idx in inspector.get_indexes(table)}
    return set()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "delivery_places" not in inspector.get_table_names():
        op.create_table(
            "delivery_places",
            sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column("delivery_place_code", sa.String(), nullable=False),
            sa.Column("delivery_place_name", sa.String(), nullable=False),
            sa.Column("address", sa.String(), nullable=True),
            sa.Column("postal_code", sa.String(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("created_by", sa.String(length=50), nullable=True),
            sa.Column("updated_by", sa.String(length=50), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
            sa.UniqueConstraint("delivery_place_code", name="uq_delivery_places_code"),
        )
        op.create_index(
            "ix_delivery_places_delivery_place_code",
            "delivery_places",
            ["delivery_place_code"],
        )

    inspector = sa.inspect(bind)
    product_columns = {col["name"] for col in inspector.get_columns("products")}
    product_fks = _constraint_names(inspector, "products", "foreign")
    product_ucs = _constraint_names(inspector, "products", "unique")
    with op.batch_alter_table("products", recreate="auto") as batch_op:
        if "maker_part_no" in product_columns:
            batch_op.alter_column("maker_part_no", new_column_name="maker_item_code")

        if "supplier_item_code" not in product_columns:
            batch_op.add_column(sa.Column("supplier_item_code", sa.String(), nullable=True))
        if "supplier_code" not in product_columns:
            batch_op.add_column(sa.Column("supplier_code", sa.Text(), nullable=True))
        if "delivery_place_id" not in product_columns:
            batch_op.add_column(sa.Column("delivery_place_id", sa.BigInteger(), nullable=True))
        if "ji_ku_text" not in product_columns:
            batch_op.add_column(sa.Column("ji_ku_text", sa.String(), nullable=True))
        if "kumitsuke_ku_text" not in product_columns:
            batch_op.add_column(sa.Column("kumitsuke_ku_text", sa.String(), nullable=True))
        if "delivery_place_name" not in product_columns:
            batch_op.add_column(sa.Column("delivery_place_name", sa.String(), nullable=True))
        if "shipping_warehouse_name" not in product_columns:
            batch_op.add_column(sa.Column("shipping_warehouse_name", sa.String(), nullable=True))

        if "fk_products_supplier_code" not in product_fks:
            batch_op.create_foreign_key(
                "fk_products_supplier_code",
                "suppliers",
                ["supplier_code"],
                ["supplier_code"],
            )
        if "fk_products_delivery_place" not in product_fks:
            batch_op.create_foreign_key(
                "fk_products_delivery_place",
                "delivery_places",
                ["delivery_place_id"],
                ["id"],
            )

        if "uq_products_supplier_maker_item" not in product_ucs:
            batch_op.create_unique_constraint(
                "uq_products_supplier_maker_item",
                ["supplier_code", "maker_item_code"],
            )
        if "uq_products_supplier_supplier_item" not in product_ucs:
            batch_op.create_unique_constraint(
                "uq_products_supplier_supplier_item",
                ["supplier_code", "supplier_item_code"],
            )

    inspector = sa.inspect(bind)
    order_line_columns = {col["name"] for col in inspector.get_columns("order_lines")}
    order_line_fks = _constraint_names(inspector, "order_lines", "foreign")
    with op.batch_alter_table("order_lines", recreate="auto") as batch_op:
        if "destination_id" not in order_line_columns:
            batch_op.add_column(sa.Column("destination_id", sa.BigInteger(), nullable=True))
        if "fk_order_lines_destination" not in order_line_fks:
            batch_op.create_foreign_key(
                "fk_order_lines_destination",
                "delivery_places",
                ["destination_id"],
                ["id"],
            )

    inspector = sa.inspect(bind)
    allocation_columns = {col["name"] for col in inspector.get_columns("allocations")}
    allocation_fks = _constraint_names(inspector, "allocations", "foreign")
    with op.batch_alter_table("allocations", recreate="auto") as batch_op:
        if "destination_id" not in allocation_columns:
            batch_op.add_column(sa.Column("destination_id", sa.BigInteger(), nullable=True))
        if "fk_allocations_destination" not in allocation_fks:
            batch_op.create_foreign_key(
                "fk_allocations_destination",
                "delivery_places",
                ["destination_id"],
                ["id"],
            )

    if _table_has_column(inspector, "lots", "warehouse_id"):
        with op.batch_alter_table("lots", recreate="auto") as batch_op:
            batch_op.alter_column("warehouse_id", nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    inspector = sa.inspect(bind)
    allocation_columns = {col["name"] for col in inspector.get_columns("allocations")}
    allocation_fks = _constraint_names(inspector, "allocations", "foreign")
    with op.batch_alter_table("allocations", recreate="auto") as batch_op:
        if "fk_allocations_destination" in allocation_fks:
            batch_op.drop_constraint("fk_allocations_destination", type_="foreignkey")
        if "destination_id" in allocation_columns:
            batch_op.drop_column("destination_id")

    inspector = sa.inspect(bind)
    order_line_columns = {col["name"] for col in inspector.get_columns("order_lines")}
    order_line_fks = _constraint_names(inspector, "order_lines", "foreign")
    with op.batch_alter_table("order_lines", recreate="auto") as batch_op:
        if "fk_order_lines_destination" in order_line_fks:
            batch_op.drop_constraint("fk_order_lines_destination", type_="foreignkey")
        if "destination_id" in order_line_columns:
            batch_op.drop_column("destination_id")

    inspector = sa.inspect(bind)
    product_columns = {col["name"] for col in inspector.get_columns("products")}
    product_fks = _constraint_names(inspector, "products", "foreign")
    product_ucs = _constraint_names(inspector, "products", "unique")
    with op.batch_alter_table("products", recreate="auto") as batch_op:
        if "uq_products_supplier_maker_item" in product_ucs:
            batch_op.drop_constraint("uq_products_supplier_maker_item", type_="unique")
        if "uq_products_supplier_supplier_item" in product_ucs:
            batch_op.drop_constraint("uq_products_supplier_supplier_item", type_="unique")

        if "fk_products_delivery_place" in product_fks:
            batch_op.drop_constraint("fk_products_delivery_place", type_="foreignkey")
        if "fk_products_supplier_code" in product_fks:
            batch_op.drop_constraint("fk_products_supplier_code", type_="foreignkey")

        if "shipping_warehouse_name" in product_columns:
            batch_op.drop_column("shipping_warehouse_name")
        if "delivery_place_name" in product_columns:
            batch_op.drop_column("delivery_place_name")
        if "kumitsuke_ku_text" in product_columns:
            batch_op.drop_column("kumitsuke_ku_text")
        if "ji_ku_text" in product_columns:
            batch_op.drop_column("ji_ku_text")
        if "delivery_place_id" in product_columns:
            batch_op.drop_column("delivery_place_id")
        if "supplier_code" in product_columns:
            batch_op.drop_column("supplier_code")
        if "supplier_item_code" in product_columns:
            batch_op.drop_column("supplier_item_code")

        if "maker_item_code" in product_columns:
            batch_op.alter_column("maker_item_code", new_column_name="maker_part_no")

    inspector = sa.inspect(bind)
    if _table_has_column(inspector, "lots", "warehouse_id"):
        with op.batch_alter_table("lots", recreate="auto") as batch_op:
            batch_op.alter_column("warehouse_id", nullable=False)

    if "ix_delivery_places_delivery_place_code" in _constraint_names(
        inspector, "delivery_places", "index"
    ):
        op.drop_index("ix_delivery_places_delivery_place_code", table_name="delivery_places")
    if "delivery_places" in inspector.get_table_names():
        op.drop_table("delivery_places")
