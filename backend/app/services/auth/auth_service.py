from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User
from app.schemas.auth.token_schema import TokenData
from app.services.auth.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/login")


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
        if not self.user_service.verify_password(password, user.password_hash):
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
        return encoded_jwt

    @staticmethod
    def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
        """Get the current authenticated user from the token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
        except JWTError:
            raise credentials_exception

        user_service = UserService(db)
        user = user_service.get_by_username(username=token_data.username)
        if user is None:
            raise credentials_exception
        return user
