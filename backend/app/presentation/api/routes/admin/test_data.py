from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.application.services.job_manager import job_manager
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
    background_tasks: BackgroundTasks,
    request: GenerateRequest | None = None,
):
    """Generate test data in background.

    Returns a job_id to track progress.
    WARNING: This will DELETE all existing data in related tables.
    """
    try:
        if request is None:
            request = GenerateRequest()

        options_dict = request.dict(exclude_unset=True)
        job_id = job_manager.create_job()

        def run_generation():
            def cb(p, m):
                job_manager.update_job(job_id, progress=p, message=m)

            try:
                # Use a new session for background task
                with SessionLocal() as session:
                    orchestrator.generate(session, options_dict, progress_callback=cb)

                job_manager.update_job(
                    job_id, status="completed", progress=100, message="Completed"
                )
            except Exception as e:
                import logging

                logging.getLogger(__name__).exception(f"Test data generation failed: {e}")
                job_manager.update_job(job_id, status="failed", error=str(e))

        background_tasks.add_task(run_generation)

        return {
            "success": True,
            "message": "Test data generation started in background",
            "job_id": job_id,
            "options": options_dict,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/progress/{job_id}")
def get_progress(job_id: str):
    """Get generation progress."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
