from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.services.replenishment.engine import ReplenishmentEngine
from app.application.services.replenishment.recommendation import ReplenishmentRecommendation
from app.presentation.api.deps import get_db


router = APIRouter()


@router.post("/recommendations/run", response_model=list[ReplenishmentRecommendation])
def run_replenishment_recommendations(
    warehouse_id: int = Query(..., description="Warehouse ID"),
    as_of_date: date | None = None,
    method: str = "moving_average_seasonal",
    product_ids: list[int] | None = Query(None),
    db: Session = Depends(get_db),
):
    """Run replenishment calculation and return recommendations."""
    engine = ReplenishmentEngine(db)
    try:
        recommendations = engine.run(
            warehouse_id=warehouse_id, product_ids=product_ids, as_of_date=as_of_date, method=method
        )
        return recommendations
    except Exception as e:
        import logging

        logging.getLogger(__name__).exception(f"Replenishment run failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations", response_model=list[ReplenishmentRecommendation])
def get_recommendations(
    warehouse_id: int = Query(..., description="Warehouse ID"), db: Session = Depends(get_db)
):
    """Get existing recommendations (Placeholder: currently re-runs calculation).

    Since we decided on minimal persistence for Phase 1, we will re-run the calculation
    or return an empty list if not persisted.
    For this implementation, we will perform a 'dry run' lookalike or just re-run.
    """
    # Simply re-run for now as we don't allow storing results in DB yet (Minimal)
    return run_replenishment_recommendations(warehouse_id=warehouse_id, db=db)


@router.get("/explain/{id}")
def explain_recommendation(id: str):
    """Get explanation for a specific recommendation.

    Since we don't persist, we cannot fetch by ID unless we cache it.
    For Phase 1 (Minimal), this might return a dummy or require re-run params.

    TODO: Implement persistence.
    """
    raise HTTPException(
        status_code=501,
        detail="Explanation by ID not implemented without persistence. Use /recommendations/run response.",
    )
