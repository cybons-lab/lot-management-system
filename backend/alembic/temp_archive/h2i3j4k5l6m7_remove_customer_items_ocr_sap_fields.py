"""Remove OCR/SAP fields from customer_items table.

Revision ID: h2i3j4k5l6m7
Revises: 85aaf971a93f
Create Date: 2026-01-26

These fields are unused in actual OCR processing (which uses ShippingMasterCurated).
Removing to simplify the 先方品番マスタ (CustomerItem) structure.

Fields removed:
- maker_part_no
- order_category
- is_procurement_required
- shipping_slip_text
- ocr_conversion_notes
- sap_supplier_code
- sap_warehouse_code
- sap_shipping_warehouse
- sap_uom
- sap_notes
- shipping_document_template
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "h2i3j4k5l6m7"
down_revision = "85aaf971a93f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove OCR/SAP fields from customer_items table."""
    # Drop the index first
    op.drop_index("idx_customer_items_order_category", table_name="customer_items")

    # Drop OCR/SAP conversion fields
    op.drop_column("customer_items", "maker_part_no")
    op.drop_column("customer_items", "order_category")
    op.drop_column("customer_items", "is_procurement_required")
    op.drop_column("customer_items", "shipping_slip_text")
    op.drop_column("customer_items", "ocr_conversion_notes")

    # Drop SAP cache fields
    op.drop_column("customer_items", "sap_supplier_code")
    op.drop_column("customer_items", "sap_warehouse_code")
    op.drop_column("customer_items", "sap_shipping_warehouse")
    op.drop_column("customer_items", "sap_uom")
    op.drop_column("customer_items", "sap_notes")

    # Drop shipping document template
    op.drop_column("customer_items", "shipping_document_template")


def downgrade() -> None:
    """Restore OCR/SAP fields to customer_items table."""
    # Restore shipping document template
    op.add_column(
        "customer_items",
        sa.Column("shipping_document_template", sa.String(50), nullable=True),
    )

    # Restore SAP cache fields
    op.add_column(
        "customer_items",
        sa.Column("sap_notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("sap_uom", sa.String(20), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("sap_shipping_warehouse", sa.String(20), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("sap_warehouse_code", sa.String(20), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("sap_supplier_code", sa.String(50), nullable=True),
    )

    # Restore OCR/SAP conversion fields
    op.add_column(
        "customer_items",
        sa.Column("ocr_conversion_notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("shipping_slip_text", sa.String(200), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "is_procurement_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column("order_category", sa.String(20), nullable=True),
    )
    op.add_column(
        "customer_items",
        sa.Column("maker_part_no", sa.String(100), nullable=True),
    )

    # Recreate index
    op.create_index(
        "idx_customer_items_order_category",
        "customer_items",
        ["order_category"],
    )
