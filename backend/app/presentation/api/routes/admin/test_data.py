from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.application.services.test_data.orchestrator import TestDataOrchestrator
from app.core.database import SessionLocal


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
    request: GenerateRequest | None = None,
):
    """Generate test data synchronously for E2E tests.

    WARNING: This will DELETE all existing data in related tables.
    """
    try:
        if request is None:
            request = GenerateRequest()

        options_dict = request.dict(exclude_unset=True)

        # Use a new session for generation
        with SessionLocal() as session:
            orchestrator.generate(session, options_dict)

        return {
            "success": True,
            "message": "Test data generation completed",
            "options": options_dict,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=403, detail=str(e))
