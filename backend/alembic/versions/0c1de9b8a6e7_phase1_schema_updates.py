"""Phase 1 schema updates for packaging, orders, lots, inbound submissions, next_div_map."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0c1de9b8a6e7"
down_revision = "c6d1f3f1e2ab"
branch_labels = None
depends_on = None


def _parse_packaging(value: str | None) -> tuple[Decimal, str | None, str | None]:
    """Return quantity, packaging unit, internal unit derived from legacy packaging string."""
    default_qty = Decimal("1")
    if not value:
        return default_qty, None, None

    packaging_part, internal_unit = value, None
    if "/" in value:
        packaging_part, internal_unit = value.split("/", 1)
        internal_unit = internal_unit.strip() or None

    packaging_part = packaging_part.strip()
    qty = default_qty
    unit = None

    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*(.*)$", packaging_part)
    if match:
        number, suffix = match.groups()
        try:
            qty = Decimal(number)
        except InvalidOperation:
            qty = default_qty
        unit = suffix.strip() or None
    else:
        try:
            qty = Decimal(packaging_part)
        except InvalidOperation:
            qty = default_qty

    return qty, unit, internal_unit


def _format_decimal(value: Decimal | None) -> str:
    if value is None:
        return "0"
    if not isinstance(value, Decimal):
        try:
            value = Decimal(str(value))
        except InvalidOperation:
            return str(value)
    normalized = value.normalize()
    as_str = format(normalized, "f")
    return as_str.rstrip("0").rstrip(".") or "0"


def upgrade() -> None:
    # Products – introduce structured packaging fields
    op.add_column(
        "products",
        sa.Column("packaging_qty", sa.Numeric(10, 2), nullable=False, server_default="1"),
    )
    op.add_column(
        "products",
        sa.Column("packaging_unit", sa.String(length=20), nullable=False, server_default="EA"),
    )

    bind = op.get_bind()
    metadata = sa.MetaData()
    products = sa.Table("products", metadata, autoload_with=bind)

    # Populate new columns from legacy packaging values
    rows = bind.execute(
        sa.select(
            products.c.product_code,
            products.c.packaging,
            products.c.internal_unit,
            products.c.base_unit,
        )
    ).fetchall()

    for row in rows:
        qty, packaging_unit, internal_unit = _parse_packaging(row.packaging)
        update_values = {
            "packaging_qty": qty,
            "packaging_unit": packaging_unit or row.base_unit or row.internal_unit or "EA",
        }
        if internal_unit:
            update_values["internal_unit"] = internal_unit
        bind.execute(
            products.update()
            .where(products.c.product_code == row.product_code)
            .values(**update_values)
        )

    op.drop_column("products", "packaging")

    # Orders / OrderLines adjustments
    op.add_column("orders", sa.Column("customer_order_no", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("customer_order_no_last6", sa.String(length=6), nullable=True))
    op.add_column("orders", sa.Column("delivery_mode", sa.Text(), nullable=True))
    op.add_column("order_lines", sa.Column("next_div", sa.Text(), nullable=True))

    # Lots quality / lock metadata
    op.add_column(
        "lots",
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("lots", sa.Column("lock_reason", sa.Text(), nullable=True))
    op.add_column("lots", sa.Column("inspection_date", sa.Date(), nullable=True))
    op.add_column("lots", sa.Column("inspection_result", sa.Text(), nullable=True))

    # Rename OCR submissions to inbound submissions and adjust metadata
    op.rename_table("ocr_submissions", "inbound_submissions")
    inbound = sa.Table("inbound_submissions", metadata, autoload_with=bind)
    bind.execute(
        inbound.update()
        .where(inbound.c.source.is_(None))
        .values(source="ocr")
    )
    with op.batch_alter_table("inbound_submissions", recreate="auto") as batch_op:
        batch_op.alter_column(
            "source",
            existing_type=sa.Text(),
            type_=sa.String(length=20),
            nullable=False,
            server_default="ocr",
        )

    # Next division mapping table
    op.create_table(
        "next_div_map",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("customer_code", sa.Text(), nullable=False),
        sa.Column("ship_to_code", sa.Text(), nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("next_div", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "customer_code", "ship_to_code", "product_code", name="uq_next_div_map_customer_ship_to_product"
        ),
    )


def downgrade() -> None:
    op.drop_table("next_div_map")

    with op.batch_alter_table("inbound_submissions", recreate="auto") as batch_op:
        batch_op.alter_column(
            "source",
            existing_type=sa.String(length=20),
            type_=sa.Text(),
            nullable=True,
            server_default=None,
        )
    op.rename_table("inbound_submissions", "ocr_submissions")

    op.drop_column("lots", "inspection_result")
    op.drop_column("lots", "inspection_date")
    op.drop_column("lots", "lock_reason")
    op.drop_column("lots", "is_locked")

    op.drop_column("order_lines", "next_div")
    op.drop_column("orders", "delivery_mode")
    op.drop_column("orders", "customer_order_no_last6")
    op.drop_column("orders", "customer_order_no")

    bind = op.get_bind()
    metadata = sa.MetaData()
    products = sa.Table("products", metadata, autoload_with=bind)

    op.add_column("products", sa.Column("packaging", sa.Text(), nullable=True))

    products_with_packaging = sa.Table("products", sa.MetaData(), autoload_with=bind)

    rows = bind.execute(
        sa.select(
            products_with_packaging.c.product_code,
            products_with_packaging.c.packaging_qty,
            products_with_packaging.c.packaging_unit,
            products_with_packaging.c.internal_unit,
        )
    ).fetchall()

    for row in rows:
        qty = row.packaging_qty or Decimal("1")
        unit = row.packaging_unit or ""
        internal_unit = row.internal_unit or ""
        packaging = f"{_format_decimal(qty)}{unit}"
        if internal_unit:
            packaging = f"{packaging}/{internal_unit}"
        bind.execute(
            products_with_packaging.update()
            .where(products_with_packaging.c.product_code == row.product_code)
            .values(packaging=packaging)
        )

    op.drop_column("products", "packaging_unit")
    op.drop_column("products", "packaging_qty")
