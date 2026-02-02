"""add_is_system_user_flag

Revision ID: b20a425f473c
Revises: 8af504933821
Create Date: 2026-02-02 23:18:46.337734

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b20a425f473c"
down_revision = "8af504933821"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add is_system_user flag to users table and mark system users."""
    # Add is_system_user column (default False)
    op.add_column(
        "users",
        sa.Column("is_system_user", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # Mark existing guest and admin users as system users
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE users
            SET is_system_user = true
            WHERE username IN ('guest', 'admin')
        """)
    )


def downgrade() -> None:
    """Remove is_system_user flag from users table."""
    op.drop_column("users", "is_system_user")
