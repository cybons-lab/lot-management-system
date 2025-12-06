from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, decode_access_token
from app.models.auth_models import User
from app.schemas.auth.auth_schemas import LoginRequest, TokenResponse, UserResponse

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
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Create Token
    roles = [ur.role.role_code for ur in user.user_roles]
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
        },
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    roles = [ur.role.role_code for ur in current_user.user_roles]
    return {
        "id": current_user.id,
        "username": current_user.username,
        "display_name": current_user.display_name,
        "roles": roles,
    }
