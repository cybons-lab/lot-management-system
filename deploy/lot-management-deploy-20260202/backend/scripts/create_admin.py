import os
import sys

import bcrypt


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.database import SessionLocal
from app.infrastructure.persistence.models import Role, User, UserRole


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_admin():
    db = SessionLocal()
    try:
        # Create Role
        admin_role = db.query(Role).filter_by(role_code="admin").first()
        if not admin_role:
            admin_role = Role(role_code="admin", role_name="Administrator")
            db.add(admin_role)
            print("Created admin role")
        else:
            print("Admin role exists")

        user_role = db.query(Role).filter_by(role_code="user").first()
        if not user_role:
            user_role = Role(role_code="user", role_name="User")
            db.add(user_role)
            print("Created user role")

        db.commit()

        # Create User
        user = db.query(User).filter_by(username="admin").first()
        if not user:
            user = User(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("password123"),
                display_name="Admin User",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Assign Role
            user_role_assoc = UserRole(user_id=user.id, role_id=admin_role.id)
            db.add(user_role_assoc)
            db.commit()
            print("Admin user created")
        else:
            print("Admin user already exists")
            # Ensure role is assigned
            existing_role = (
                db.query(UserRole).filter_by(user_id=user.id, role_id=admin_role.id).first()
            )
            if not existing_role:
                print("Assigning admin role to existing user")
                db.add(UserRole(user_id=user.id, role_id=admin_role.id))
                db.commit()

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
