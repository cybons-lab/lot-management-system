from datetime import timedelta
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User
from app.schemas.auth.token_schema import Token
from app.schemas.system.users_schema import SupplierAssignmentInfo, UserWithSuppliers
from app.services.auth.auth_service import AuthService


router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
) -> Token:
    """OAuth2 compatible token login, get an access token for future requests."""
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth_service.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # Update last login
    auth_service.user_service.update_last_login(user.id)

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserWithSuppliers | None)
async def get_current_user_info(
    current_user: Annotated[User | None, Depends(AuthService.get_current_user_optional)],
    db: Session = Depends(get_db),
) -> UserWithSuppliers | None:
    """Get current authenticated user information with assigned suppliers (optional authentication).

    Returns:
        User information with supplier assignments if authenticated, None if not authenticated

    Use case:
        - Frontend can check if user is logged in
        - Display user name and assigned suppliers
        - Prioritize user's assigned suppliers in list views
    """
    if current_user is None:
        return None

    # Refresh user to load relationships
    db.refresh(current_user, ["supplier_assignments"])

    # Map supplier assignments to response schema
    supplier_assignments = [
        SupplierAssignmentInfo(
            supplier_id=assignment.supplier_id,
            supplier_code=assignment.supplier.supplier_code,
            supplier_name=assignment.supplier.supplier_name,
            is_primary=assignment.is_primary,
        )
        for assignment in current_user.supplier_assignments
    ]

    # Create response
    user_data = cast(UserWithSuppliers, UserWithSuppliers.model_validate(current_user))
    user_data.supplier_assignments = supplier_assignments

    return user_data
