from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.test_data_generator import generate_all_test_data

router = APIRouter()


@router.post("/generate")
def generate_test_data_endpoint(db: Session = Depends(get_db)):
    """
    Generate test data for development.
    WARNING: This will DELETE all existing data in related tables.
    """
    try:
        generate_all_test_data(db)
        return {"success": True, "message": "Test data generated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
