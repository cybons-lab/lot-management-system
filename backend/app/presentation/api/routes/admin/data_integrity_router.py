"""データ整合性チェック・修正 API ルーター."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.admin.data_integrity_service import DataIntegrityService
from app.core.database import get_db
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.admin.data_integrity_schema import (
    DataIntegrityFixRequest,
    DataIntegrityFixResponse,
    DataIntegrityFixResult,
    DataIntegrityScanResponse,
    DataIntegrityViolation,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/data-integrity",
    tags=["admin-data-integrity"],
)


@router.get("", response_model=DataIntegrityScanResponse)
def scan_violations(
    db: Session = Depends(get_db),
    _current_admin: object = Depends(get_current_admin),
) -> DataIntegrityScanResponse:
    """全テーブルの NOT NULL 違反をスキャンする."""
    service = DataIntegrityService(db)
    violations = service.scan_all()

    return DataIntegrityScanResponse(
        violations=[DataIntegrityViolation(**v.to_dict()) for v in violations],
        total_violations=len(violations),
        total_affected_rows=sum(v.violation_count for v in violations),
    )


@router.post("/fix", response_model=DataIntegrityFixResponse)
def fix_violations(
    request: DataIntegrityFixRequest,
    db: Session = Depends(get_db),
    _current_admin: object = Depends(get_current_admin),
) -> DataIntegrityFixResponse:
    """REPAIR_RULES に基づき NULL 違反を修正する."""
    service = DataIntegrityService(db)
    result = service.fix_violations(
        table_name=request.table_name,
        column_name=request.column_name,
    )

    logger.info(
        "Data integrity fix requested",
        extra={
            "table": request.table_name,
            "column": request.column_name,
            "fixed_count": len(result["fixed"]),
        },
    )

    return DataIntegrityFixResponse(
        fixed=[DataIntegrityFixResult(**f) for f in result["fixed"]],
        skipped=result.get("skipped", []),
        total_rows_fixed=sum(f["rows_fixed"] for f in result["fixed"]),
    )
