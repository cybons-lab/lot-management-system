"""add_test_regular_user

Revision ID: a4b7d88246db
Revises: b20a425f473c
Create Date: 2026-02-02 23:33:07.286161

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a4b7d88246db"
down_revision = "b20a425f473c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create test regular user for development/testing."""
    conn = op.get_bind()

    # Create test regular user if not exists
    conn.execute(
        sa.text("""
            INSERT INTO users (username, email, display_name, is_active, is_system_user, created_at, updated_at)
            VALUES ('testuser', 'testuser@example.com', 'テストユーザー', true, false, NOW(), NOW())
            ON CONFLICT (username) DO NOTHING
        """)
    )

    # Assign user role to test user
    conn.execute(
        sa.text("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id
            FROM users u, roles r
            WHERE u.username = 'testuser' AND r.role_code = 'user'
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    """Remove test regular user."""
    conn = op.get_bind()

    # Remove test user's role assignment
    conn.execute(
        sa.text("""
            DELETE FROM user_roles
            WHERE user_id IN (SELECT id FROM users WHERE username = 'testuser')
        """)
    )

    # Remove test user
    conn.execute(
        sa.text("""
            DELETE FROM users
            WHERE username = 'testuser'
        """)
    )
