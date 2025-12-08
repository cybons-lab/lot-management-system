"""Master import API endpoints.

Provides endpoints for multi-table master data import from
JSON, YAML, or Excel files.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.application.services.master_import.file_handlers import (
    FileParseError,
    UnsupportedFileFormatError,
    parse_import_file,
)
from app.application.services.master_import.import_service import MasterImportService
from app.presentation.api.deps import get_db
from app.presentation.schemas.import_schema import MasterImportRequest, MasterImportResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/master-import", tags=["Master Import"])


@router.post("/upload", response_model=MasterImportResponse)
async def import_from_file(
    file: Annotated[UploadFile, File(description="Import file (.xlsx, .json, .yaml, .yml)")],
    dry_run: bool = False,
    db: Session = Depends(get_db),
) -> MasterImportResponse:
    """Import master data from uploaded file.

    Supported formats:
    - Excel (.xlsx) with 'suppliers' and/or 'customers' sheets
    - JSON (.json)
    - YAML (.yaml, .yml)

    CSV is NOT supported and will return an error.

    Args:
        file: Upload file
        dry_run: If true, validate only without committing
        db: Database session

    Returns:
        Import result with status and details per table
    """
    try:
        request = await parse_import_file(file)
        request.dry_run = dry_run
    except UnsupportedFileFormatError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileParseError as e:
        raise HTTPException(status_code=400, detail=str(e))

    service = MasterImportService(db)
    return service.execute_import(request)


@router.post("/json", response_model=MasterImportResponse)
def import_from_json(
    request: MasterImportRequest,
    db: Session = Depends(get_db),
) -> MasterImportResponse:
    """Import master data from JSON request body.

    This endpoint accepts the import data directly as JSON,
    useful for API integrations and testing.

    Args:
        request: Import request with supply_data and/or customer_data
        db: Database session

    Returns:
        Import result with status and details per table
    """
    service = MasterImportService(db)
    return service.execute_import(request)


@router.get("/template")
def download_template(group: str = "supply") -> dict:
    """Get template structure for imports.

    Args:
        group: 'supply' for supplier/product data, 'customer' for customer data

    Returns:
        JSON template structure
    """
    if group == "supply":
        return {
            "supply_data": {
                "suppliers": [
                    {
                        "supplier_code": "V001",
                        "supplier_name": "サンプル仕入先",
                        "products": [
                            {
                                "maker_part_code": "M001",
                                "product_name": "サンプル製品",
                                "is_primary": True,
                                "lead_time_days": 5,
                            }
                        ],
                    }
                ]
            }
        }
    elif group == "customer":
        return {
            "customer_data": {
                "customers": [
                    {
                        "customer_code": "C001",
                        "customer_name": "サンプル得意先",
                        "delivery_places": [
                            {
                                "delivery_place_code": "DP001",
                                "delivery_place_name": "サンプル納品先",
                            }
                        ],
                        "items": [
                            {
                                "external_product_code": "EXT-001",
                                "maker_part_code": "M001",
                                "supplier_code": "V001",
                            }
                        ],
                    }
                ]
            }
        }
    else:
        return {
            "supply_data": {"suppliers": []},
            "customer_data": {"customers": []},
        }


@router.get("/template/order")
def download_order_template() -> dict:
    """Get template structure for order data imports.

    Returns:
        JSON template structure for order lines with SAP business keys
    """
    return {
        "order_data": {
            "order_lines": [
                {
                    "customer_code": "C001",
                    "product_code": "M001",
                    "order_date": "2025-01-15",
                    "customer_order_no": "123456",
                    "customer_order_line_no": "001",
                    "sap_order_no": "4500001234",
                    "sap_order_item_no": "000010",
                    "delivery_place_code": "DP001",
                    "order_quantity": "100",
                    "unit": "PC",
                    "delivery_date": "2025-01-20",
                }
            ],
            "inbound_plans": [
                {
                    "plan_number": "IP-001",
                    "supplier_code": "V001",
                    "planned_arrival_date": "2025-01-25",
                    "sap_po_number": "4500001000",
                }
            ],
        }
    }
