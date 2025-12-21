from fastapi import status
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.rpa_models import RpaRun, RpaRunItem, RpaRunStatus


def test_get_runs_empty(client):
    response = client.get("/api/v1/rpa/material-delivery-note/runs")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_create_run_from_csv(client, db: Session):
    # Prepare CSV
    csv_content = (
        "ステータス,出荷先,層別,材質コード,納期,納入量,出荷便\n"
        "集荷指示前,B509,0902,8891078,2025/12/22,200,B509/便\n"
    ).encode("shift_jis")

    files = {"file": ("test.csv", csv_content, "text/csv")}

    response = client.post(
        "/api/v1/rpa/material-delivery-note/runs/upload",
        files=files,
        data={"import_type": "material_delivery_note"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] is not None
    assert data["rpa_type"] == "material_delivery_note"

    # Verify DB
    run = db.query(RpaRun).filter(RpaRun.id == data["id"]).first()
    assert run is not None
    # Orchestrator automatically transitions to READY_FOR_STEP2 logic
    # Wait, the unit test saw READY_FOR_STEP2.
    assert run.status == RpaRunStatus.READY_FOR_STEP2


def test_update_item_uow(client, db: Session):
    # Setup Data
    run = RpaRun(status=RpaRunStatus.DRAFT, rpa_type="material_delivery_note", started_at=utcnow())
    db.add(run)
    db.flush()
    item = RpaRunItem(run_id=run.id, row_no=1)
    db.add(item)
    db.commit()

    # Update via API
    payload = {"delivery_quantity": 999}
    response = client.put(
        f"/api/v1/rpa/material-delivery-note/runs/{run.id}/items/{item.id}", json=payload
    )

    assert response.status_code == status.HTTP_200_OK

    # Verify DB
    db.expire_all()
    updated_item = db.query(RpaRunItem).filter(RpaRunItem.id == item.id).first()
    assert updated_item.delivery_quantity == 999
