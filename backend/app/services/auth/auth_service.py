from datetime import UTC, datetime, timedelta
from typing import cast

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User
from app.services.auth.user_service import UserService


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/login")
# Optional authentication scheme (does not raise error if token is missing)
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/login", auto_error=False
)


class AuthService:
    """Service for authentication and token management."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self.user_service = UserService(db)

    def authenticate_user(self, username: str, password: str) -> User | None:
        """Authenticate a user by username and password."""
        user = self.user_service.get_by_username(username)
        if not user:
            return None
        if not user.password_hash or not self.user_service.verify_password(password, user.password_hash):
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
        return cast(str, encoded_jwt)

    @staticmethod
    def get_current_user(
        token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
    ) -> User:
        """Get the current authenticated user from the token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            username: str | None = payload.get("sub")
            if username is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user_service = UserService(db)
        # username is guaranteed to be str after the None check above
        user = user_service.get_by_username(username=username)
        if user is None:
            raise credentials_exception
        return user

    @staticmethod
    def get_current_user_optional(
        token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)
    ) -> User | None:
        """Get the current user if authenticated, otherwise return None.

        This allows optional authentication - endpoints can work both
        for authenticated and unauthenticated users.

        Use case:
        - Display personalized content for logged-in users
        - Prioritize user's assigned suppliers in list views
        - Allow access to all users but enhance experience for authenticated ones

        Args:
            token: JWT token from Authorization header (optional)
            db: Database session

        Returns:
            User object if authenticated and valid, None otherwise
        """
        if not token:
            return None

        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            username: str | None = payload.get("sub")
            if username is None:
                return None
        except JWTError:
            return None

        user_service = UserService(db)
        # username is guaranteed to be str after the None check above
        user = user_service.get_by_username(username=username)
        return user
