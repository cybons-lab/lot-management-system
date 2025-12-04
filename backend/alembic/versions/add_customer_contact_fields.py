"""Add customer contact fields.

Revision ID: add_customer_contact_fields
Revises: f3e7b6fd7de7
Create Date: 2025-12-04
"""

import sqlalchemy as sa

from alembic import op


revision = "add_customer_contact_fields"
down_revision = "f3e7b6fd7de7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add address, contact_name, phone, email to customers table."""
    op.add_column("customers", sa.Column("address", sa.String(500), nullable=True))
    op.add_column("customers", sa.Column("contact_name", sa.String(100), nullable=True))
    op.add_column("customers", sa.Column("phone", sa.String(50), nullable=True))
    op.add_column("customers", sa.Column("email", sa.String(200), nullable=True))


def downgrade() -> None:
    """Remove customer contact fields."""
    op.drop_column("customers", "email")
    op.drop_column("customers", "phone")
    op.drop_column("customers", "contact_name")
    op.drop_column("customers", "address")
