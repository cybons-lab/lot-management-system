"""SmartRead Admin OCR router.

管理者専用のOCRハイブリッド取得API。
"""

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.application.services.smartread import SmartReadService
from app.infrastructure.persistence.models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rpa/smartread", tags=["smartread-admin"])


@router.post("/admin/upload-hybrid")
async def admin_upload_hybrid(
    files: list[Annotated[UploadFile, File(description="解析するファイル（複数可）")]],
    config_id: int = Query(..., description="使用する設定のID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """管理者用ハイブリッドアップロード.

    複数のファイルをアップロードし、CSVと詳細JSONをセットにしたZIPを返します。
    常に新規タスクを作成します。
    """
    # 管理者ロールのチェック
    is_admin = any(ur.role.role_code == "admin" for ur in current_user.user_roles)
    if not is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    logger.info(
        "Admin hybrid upload started",
        extra={"config_id": config_id, "file_count": len(files), "user_id": current_user.id},
    )

    # ファイルデータの準備
    file_data = []
    for f in files:
        content = await f.read()
        file_data.append((content, f.filename or "unknown"))

    service = SmartReadService(db)
    try:
        zip_binary = await service.process_admin_upload(config_id, file_data)

        filename = f"smartread_admin_{config_id}.zip"
        return Response(
            content=zip_binary,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.exception("Admin hybrid upload failed")
        raise HTTPException(status_code=500, detail=str(e))
