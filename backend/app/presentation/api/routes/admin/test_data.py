from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.test_data.orchestrator import TestDataOrchestrator
from app.presentation.api.deps import get_db


router = APIRouter()
orchestrator = TestDataOrchestrator()


class GenerateRequest(BaseModel):
    preset_id: str = "quick"
    scale: str | None = None
    mode: str | None = None
    include_demand_patterns: bool | None = None
    include_stockout_scenarios: bool | None = None
    include_lt_variance: bool | None = None
    base_date: str | None = None
    history_months: int | None = None


@router.get("/presets")
def get_presets():
    """Available test data generation presets."""
    return orchestrator.get_presets()


@router.post("/generate")
def generate_test_data_endpoint(
    request: GenerateRequest | None = None, db: Session = Depends(get_db)
):
    """Generate test data for development.

    WARNING: This will DELETE all existing data in related tables.
    """
    try:
        if request is None:
            request = GenerateRequest()

        # Pydantic model to dict, filtering None to allow defaults in logic
        options_dict = request.dict(exclude_unset=True)
        orchestrator.generate(db, options_dict)
        return {
            "success": True,
            "message": "Test data generated successfully",
            "options": options_dict,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Safety check failed
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        import logging

        logging.getLogger(__name__).exception(f"Test data generation failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during data generation")
