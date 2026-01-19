"""add sap markers to lot_reservations

Revision ID: a1b2c3d4e5f6
Revises: c77cd9420d29
Create Date: 2024-12-14

P3: Add SAP registration markers to lot_reservations.
CONFIRMED status requires explicit SAP registration.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "c77cd9420d29"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add SAP markers to lot_reservations table."""
    op.add_column(
        "lot_reservations",
        sa.Column(
            "sap_document_no",
            sa.String(20),
            nullable=True,
            comment="SAP document number (set on successful SAP registration)",
        ),
    )
    op.add_column(
        "lot_reservations",
        sa.Column(
            "sap_registered_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Timestamp when reservation was registered in SAP",
        ),
    )

    # Add index for SAP document lookups
    op.create_index(
        "idx_lot_reservations_sap_document",
        "lot_reservations",
        ["sap_document_no"],
        postgresql_where=sa.text("sap_document_no IS NOT NULL"),
    )


def downgrade() -> None:
    """Remove SAP markers from lot_reservations table."""
    op.drop_index("idx_lot_reservations_sap_document", table_name="lot_reservations")
    op.drop_column("lot_reservations", "sap_registered_at")
    op.drop_column("lot_reservations", "sap_document_no")
