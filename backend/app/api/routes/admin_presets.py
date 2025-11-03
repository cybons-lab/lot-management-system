"""Admin preset management endpoints."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import (
    AdminPresetListResponse,
    AdminPresetLoadResponse,
    MasterBulkLoadRequest,
)

from .masters_bulk_load import perform_master_bulk_load

PRESET_DIR = Path(__file__).resolve().parents[2] / "sample_presets"

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/presets", response_model=AdminPresetListResponse)
def list_presets() -> AdminPresetListResponse:
    """Return available preset names."""

    if not PRESET_DIR.exists():
        return AdminPresetListResponse(presets=[])

    presets = sorted(p.stem for p in PRESET_DIR.glob("*.json"))
    return AdminPresetListResponse(presets=presets)


@router.post("/load-preset", response_model=AdminPresetLoadResponse)
def load_preset(
    name: str = Query(..., description="プリセット名"),
    db: Session = Depends(get_db),
) -> AdminPresetLoadResponse:
    """Load a preset JSON file and bulk insert masters."""

    file_path = PRESET_DIR / f"{name}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="プリセットが見つかりません")

    with file_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    request = MasterBulkLoadRequest.model_validate(payload)
    result = perform_master_bulk_load(db, request)
    return AdminPresetLoadResponse(preset=name, result=result)

