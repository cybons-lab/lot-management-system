from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.schemas.auth.auth_schemas import AuthUserResponse, LoginRequest, TokenResponse


router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    """Get current user from token (Optional).

    Returns None if:
    - No token is provided
    - Token is invalid
    - User not found
    """
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()


def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Get current user or raise 401."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Get current user if admin, otherwise raise 403."""
    roles = [ur.role.role_code for ur in user.user_roles]
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user


def get_current_user_or_above(
    user: User = Depends(get_current_user),
) -> User:
    """Get current user if admin or user (not viewer), otherwise raise 403."""
    roles = [ur.role.role_code for ur in user.user_roles]
    if "admin" not in roles and "user" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User or Admin privileges required",
        )
    return user


def require_roles(allowed_roles: set[str]):
    """Require user to have one of the allowed roles.

    - guest is represented by unauthenticated user (None)
    - returns User | None for downstream usage
    """

    def dependency(user: User | None = Depends(get_current_user_optional)) -> User | None:
        roles = ["guest"] if not user else [ur.role.role_code for ur in user.user_roles]
        if not any(role in allowed_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return user

    return dependency


def require_role(allowed_roles: list[str]):
    """Require authenticated user to have one of the allowed roles.

    This is the primary role checker for the auth redesign (方式A).
    All users must be authenticated (including guests with guest tokens).

    Args:
        allowed_roles: List of allowed role codes (e.g., ["guest", "user", "admin"])

    Returns:
        Dependency function that returns authenticated User

    Raises:
        401: If user is not authenticated
        403: If user's role is not in allowed_roles
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [ur.role.role_code for ur in current_user.user_roles]
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"この操作には {', '.join(allowed_roles)} ロールが必要です",
            )
        return current_user

    return dependency


def require_write_permission():
    """Require write permission (guest users are read-only).

    This is a convenience wrapper around require_role for write operations.
    Guest users are automatically excluded from write operations.

    Returns:
        Dependency function that returns authenticated User with write permission

    Raises:
        401: If user is not authenticated
        403: If user has guest role
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [ur.role.role_code for ur in current_user.user_roles]
        if "guest" in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ゲストユーザーは読み取り専用です",
            )
        return current_user

    return dependency


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Simple login by User ID or Username."""
    query = db.query(User).filter(User.is_active.is_(True))
    if request.user_id:
        user = query.filter(User.id == request.user_id).first()
    elif request.username:
        user = query.filter(User.username == request.username).first()
    else:
        raise HTTPException(status_code=400, detail="user_id or username required")

    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Update last login
    user.last_login_at = datetime.now(UTC)
    db.commit()

    # Create Token
    roles = [ur.role.role_code for ur in user.user_roles]
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "roles": roles},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "roles": roles,
            "assignments": [
                {"supplier_id": a.supplier_id, "is_primary": a.is_primary}
                for a in user.supplier_assignments
            ],
        },
    }


@router.get("/me", response_model=AuthUserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    roles = [ur.role.role_code for ur in current_user.user_roles]
    return {
        "id": current_user.id,
        "username": current_user.username,
        "display_name": current_user.display_name,
        "roles": roles,
        "assignments": [
            {"supplier_id": a.supplier_id, "is_primary": a.is_primary}
            for a in current_user.supplier_assignments
        ],
    }


@router.get("/login-users")
def get_login_users(db: Session = Depends(get_db)):
    """Get list of active users for login page (no auth required).

    This endpoint is intentionally public to allow the dev login page
    to display a list of users without authentication.
    Only returns minimal user info (id, username, display_name).
    """
    users = db.query(User).filter(User.is_active.is_(True)).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
        }
        for user in users
    ]


@router.post("/guest-login", response_model=TokenResponse)
def guest_login(db: Session = Depends(get_db)):
    """Auto-login as guest user (方式A implementation).

    This endpoint provides automatic guest authentication to support
    the new auth redesign where all users (including guests) are authenticated.

    Finds the first active user with 'guest' role and issues a token.
    Frontend calls this automatically on initialization if no token exists.

    Returns:
        TokenResponse with guest user token

    Raises:
        500: If no guest user exists in the system
    """
    # Find first active guest user
    from app.infrastructure.persistence.models.auth_models import Role, UserRole

    guest_user = (
        db.query(User)
        .join(User.user_roles)
        .join(UserRole.role)
        .filter(
            User.is_active.is_(True),
            Role.role_code == "guest",
        )
        .first()
    )

    if not guest_user:
        raise HTTPException(
            status_code=500,
            detail="Guest user not found. Please create a user with 'guest' role.",
        )

    # Update last login
    guest_user.last_login_at = datetime.now(UTC)
    db.commit()

    # Create Token
    roles = [ur.role.role_code for ur in guest_user.user_roles]
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(guest_user.id), "username": guest_user.username, "roles": roles},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": guest_user.id,
            "username": guest_user.username,
            "display_name": guest_user.display_name,
            "roles": roles,
            "assignments": [
                {"supplier_id": a.supplier_id, "is_primary": a.is_primary}
                for a in guest_user.supplier_assignments
            ],
        },
    }
