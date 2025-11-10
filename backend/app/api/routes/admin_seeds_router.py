# backend/app/api/routes/admin_seeds.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db  # 既存の依存解決に合わせて
from app.schemas.admin_seeds_schema import SeedRequest, SeedResponse
from app.services.seeds_service import create_seed_data


router = APIRouter(prefix="/admin/seeds", tags=["admin"])


@router.post("", response_model=SeedResponse)
def post_seed(req: SeedRequest, db: Session = Depends(get_db)) -> SeedResponse:
    try:
        return create_seed_data(db, req)
    except Exception as e:
        # ここはお好みでロギング
        raise HTTPException(status_code=500, detail=str(e))
