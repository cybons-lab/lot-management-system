"""Add default admin and user accounts.

Revision ID: d4e5f6g7h8i9
Revises: b2c3d4e5f6g7
Create Date: 2025-12-14
"""

from sqlalchemy import text

from alembic import op


# revision identifiers, used by Alembic.
revision = "d4e5f6g7h8i9"
down_revision = "b2c3d4e5f6g7"
branch_labels = None
depends_on = None

# Pre-hashed password for 'password' using bcrypt
# Generated with: bcrypt.hashpw(b'password', bcrypt.gensalt()).decode()
DEFAULT_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lwh3uEwEVs9hZ5Yq."


def upgrade() -> None:
    """Add default admin and user accounts with roles."""
    connection = op.get_bind()

    # Create roles
    connection.execute(
        text("""
        INSERT INTO roles (role_code, role_name, description)
        VALUES 
            ('admin', '管理者', 'システム管理者ロール'),
            ('user', '一般ユーザー', '一般ユーザーロール')
        ON CONFLICT (role_code) DO NOTHING
        """)
    )

    # Create admin user (password: admin123, pre-hashed)
    connection.execute(
        text("""
        INSERT INTO users (username, email, password_hash, display_name, is_active, auth_provider)
        VALUES (:username, :email, :password_hash, :display_name, true, 'local')
        ON CONFLICT (username) DO NOTHING
        """),
        {
            "username": "admin",
            "email": "admin@example.com",
            "password_hash": DEFAULT_PASSWORD_HASH,
            "display_name": "管理者",
        },
    )

    # Create test user (password: user123, pre-hashed)
    connection.execute(
        text("""
        INSERT INTO users (username, email, password_hash, display_name, is_active, auth_provider)
        VALUES (:username, :email, :password_hash, :display_name, true, 'local')
        ON CONFLICT (username) DO NOTHING
        """),
        {
            "username": "user",
            "email": "user@example.com",
            "password_hash": DEFAULT_PASSWORD_HASH,
            "display_name": "テストユーザー",
        },
    )

    # Assign roles to users
    connection.execute(
        text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE u.username = 'admin' AND r.role_code IN ('admin', 'user')
        ON CONFLICT DO NOTHING
        """)
    )
    connection.execute(
        text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE u.username = 'user' AND r.role_code = 'user'
        ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    """Remove default accounts (optional - data migration)."""
    connection = op.get_bind()

    # Remove user_roles first (foreign key constraint)
    connection.execute(
        text("""
        DELETE FROM user_roles 
        WHERE user_id IN (SELECT id FROM users WHERE username IN ('admin', 'user'))
        """)
    )

    # Remove users
    connection.execute(text("DELETE FROM users WHERE username IN ('admin', 'user')"))

    # Remove roles
    connection.execute(text("DELETE FROM roles WHERE role_code IN ('admin', 'user')"))
