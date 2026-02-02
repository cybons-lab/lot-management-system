"""add_guest_user_and_role

Revision ID: 8af504933821
Revises: fe5ee626e71c
Create Date: 2026-02-02 23:17:04.524140

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "8af504933821"
down_revision = "fe5ee626e71c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create guest role and guest user for 方式A auth redesign."""
    conn = op.get_bind()

    # Create guest role if not exists
    conn.execute(
        sa.text("""
            INSERT INTO roles (role_code, role_name, description, created_at, updated_at)
            VALUES ('guest', 'Guest', 'Guest user with read-only access', NOW(), NOW())
            ON CONFLICT (role_code) DO NOTHING
        """)
    )

    # Create guest user if not exists
    conn.execute(
        sa.text("""
            INSERT INTO users (username, email, display_name, is_active, created_at, updated_at)
            VALUES ('guest', 'guest@example.com', 'ゲストユーザー', true, NOW(), NOW())
            ON CONFLICT (username) DO NOTHING
        """)
    )

    # Assign guest role to guest user
    conn.execute(
        sa.text("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id
            FROM users u, roles r
            WHERE u.username = 'guest' AND r.role_code = 'guest'
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    """Remove guest user and guest role."""
    conn = op.get_bind()

    # Remove guest user's role assignment
    conn.execute(
        sa.text("""
            DELETE FROM user_roles
            WHERE user_id IN (SELECT id FROM users WHERE username = 'guest')
        """)
    )

    # Remove guest user
    conn.execute(
        sa.text("""
            DELETE FROM users
            WHERE username = 'guest'
        """)
    )

    # Remove guest role
    conn.execute(
        sa.text("""
            DELETE FROM roles
            WHERE role_code = 'guest'
        """)
    )
