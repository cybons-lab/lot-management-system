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

    # SQL Profiler side effects
    elif key.startswith("sql_profiler_"):
        from app.core.config import settings

        val = update_data.config_value
        if key == ConfigKeys.SQL_PROFILER_ENABLED:
            settings.SQL_PROFILER_ENABLED = val.lower() in ("true", "1", "yes", "on")

            # If enabled dynamically, we might want to register listener,
            # but listeners are usually registered at startup.
            # However, since the listener checks the flag at runtime, this is fine.
            # But if we wanted to *start* measuring, the flag is enough.

        elif key == ConfigKeys.SQL_PROFILER_THRESHOLD_COUNT:
            settings.SQL_PROFILER_THRESHOLD_COUNT = int(val)
        elif key == ConfigKeys.SQL_PROFILER_THRESHOLD_TIME:
            settings.SQL_PROFILER_THRESHOLD_TIME = float(val)
        elif key == ConfigKeys.SQL_PROFILER_N_PLUS_ONE_THRESHOLD:
            settings.SQL_PROFILER_N_PLUS_ONE_THRESHOLD = int(val)
        elif key == ConfigKeys.SQL_PROFILER_NORMALIZE_LITERALS:
            settings.SQL_PROFILER_NORMALIZE_LITERALS = val.lower() in ("true", "1", "yes", "on")

    return config
