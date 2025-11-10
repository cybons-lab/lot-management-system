from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db


router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz():
    # アプリ起動のみ確認
    return {"status": "ok"}


@router.get("/readyz")
def readyz(db: Session = Depends(get_db)):
    # DB疎通確認
    db.execute(text("SELECT 1"))
    return {"status": "ready"}


@router.get("/health")
def health():
    return {"status": "ok"}
