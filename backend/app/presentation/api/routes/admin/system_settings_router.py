from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.system_config_service import ConfigKeys, SystemConfigService
from app.core.database import get_db
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.admin.system_setting_schema import (
    SystemSettingResponse,
    SystemSettingUpdate,
)


router = APIRouter(prefix="/admin/system-settings", tags=["admin-system-settings"])


@router.get("", response_model=list[SystemSettingResponse])
def list_system_settings(
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
):
    """システム設定一覧を取得."""
    service = SystemConfigService(db)
    return service.get_all()


@router.patch("/{key}", response_model=SystemSettingResponse)
def update_system_setting(
    key: str,
    update_data: SystemSettingUpdate,
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_admin),
):
    """システム設定を更新."""
    service = SystemConfigService(db)
    config = service.set(
        key=key,
        value=update_data.config_value,
        description=update_data.description,
    )

    # Apply side effects
    if key == ConfigKeys.LOG_LEVEL:
        from app.core.logging import setup_logging

        # Re-configure logging with new level immediately
        setup_logging(level=update_data.config_value)

    return config
