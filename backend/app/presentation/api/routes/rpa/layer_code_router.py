"""Layer Code Mapping Router."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.layer_code_models import LayerCodeMapping
from app.presentation.api.deps import get_db
from app.presentation.schemas.layer_code_schema import (
    LayerCodeCreate,
    LayerCodeResponse,
    LayerCodeUpdate,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rpa/layer-codes", tags=["rpa-layer-codes"])


@router.get("", response_model=list[LayerCodeResponse])
def list_layer_codes(
    db: Session = Depends(get_db),
):
    """層別コード一覧取得."""
    mappings = db.query(LayerCodeMapping).order_by(LayerCodeMapping.layer_code).all()
    return mappings


@router.post("", response_model=LayerCodeResponse, status_code=status.HTTP_201_CREATED)
def create_layer_code(
    request: LayerCodeCreate,
    db: Session = Depends(get_db),
):
    """層別コード作成."""
    logger.info("Layer code creation requested", extra={"layer_code": request.layer_code})
    existing = (
        db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code == request.layer_code).first()
    )
    if existing:
        logger.warning("Layer code already exists", extra={"layer_code": request.layer_code})
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Layer code '{request.layer_code}' already exists",
        )

    mapping = LayerCodeMapping(
        layer_code=request.layer_code,
        maker_name=request.maker_name,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.put("/{layer_code}", response_model=LayerCodeResponse)
def update_layer_code(
    layer_code: str,
    request: LayerCodeUpdate,
    db: Session = Depends(get_db),
):
    """層別コード更新."""
    logger.info("Layer code update requested", extra={"layer_code": layer_code})
    mapping = db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code == layer_code).first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Layer code '{layer_code}' not found",
        )

    mapping.maker_name = request.maker_name
    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{layer_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_layer_code(
    layer_code: str,
    db: Session = Depends(get_db),
):
    """層別コード削除."""
    logger.warning("Layer code deletion requested", extra={"layer_code": layer_code})
    mapping = db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code == layer_code).first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Layer code '{layer_code}' not found",
        )

    db.delete(mapping)
    db.commit()
    return None
