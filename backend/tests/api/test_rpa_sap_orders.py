import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import (
    RpaJob,
    SmartReadConfig,
    SmartReadLongData,
)


def test_rpa_sap_orders_workflow(client: TestClient, db: Session, superuser_token_headers: dict):
    # 0. Setup config
    cfg = SmartReadConfig(
        name="test_config", endpoint="https://example.com", api_key="dummy_key", is_active=True
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)

    # 1. Setup target data
    item1 = SmartReadLongData(
        config_id=cfg.id,
        task_id="task_test_1",
        task_date="2026-01-28",
        row_index=1,
        status="PENDING",
        content={"customer_code": "C001", "material_code": "M001"},
    )
    db.add(item1)
    db.commit()
    db.refresh(item1)

    # 2. Start RPA Job
    response = client.post(
        "/api/rpa/sap/orders/start", json={"ids": [item1.id]}, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    job_id = data["job_id"]
    assert data["target_count"] == 1

    db.refresh(item1)
    assert item1.status == "processing"
    assert str(item1.rpa_job_id) == job_id

    # 3. Checkout Data (as RPA)
    response = client.post(
        "/api/rpa/sap/orders/checkout", json={"job_id": job_id}, headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["data"]["customer_code"] == "C001"

    # 4. Verify Job (Validation reporting)
    response = client.post(
        "/api/rpa/sap/orders/verify",
        json={"job_id": job_id, "success": True},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["action"] == "proceed"

    job = db.get(RpaJob, uuid.UUID(job_id))
    assert job.status == "registering"

    # 5. Final Result (Success)
    response = client.post(
        "/api/rpa/sap/orders/result",
        json={"job_id": job_id, "success": True, "sap_order_no": "999999"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    db.refresh(job)
    assert job.status == "completed"

    # Verify archiving (item should be gone from active table)
    # Note: mark_as_completed deletes the original item
    item_after = db.get(SmartReadLongData, item1.id)
    assert item_after is None


def test_rpa_sap_orders_verify_fail(client: TestClient, db: Session, superuser_token_headers: dict):
    # Setup
    cfg = SmartReadConfig(
        name="test_config_fail", endpoint="https://example.com", api_key="dummy_key", is_active=True
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)

    item1 = SmartReadLongData(
        config_id=cfg.id,
        task_id="task_test_fail",
        task_date="2026-01-28",
        row_index=1,
        status="PENDING",
        content={"error": "test"},
    )
    db.add(item1)
    db.commit()

    # Start
    res_start = client.post(
        "/api/rpa/sap/orders/start", json={"ids": [item1.id]}, headers=superuser_token_headers
    )
    job_id = res_start.json()["job_id"]

    # Verify Fail
    response = client.post(
        "/api/rpa/sap/orders/verify",
        json={"job_id": job_id, "success": False, "error_message": "Invalid format"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["action"] == "abort"

    db.refresh(item1)
    assert item1.status == "ERROR"
    assert item1.error_reason == "Invalid format"

    job = db.get(RpaJob, uuid.UUID(job_id))
    assert job.status == "failed"
