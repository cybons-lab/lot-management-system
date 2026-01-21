"""Generate test data for RPA Material Delivery Note workflow."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.masters_models import CustomerItem
from app.infrastructure.persistence.models.rpa_models import RpaRun, RpaRunItem, RpaRunStatus


def _build_items(
    run_id: int,
    base_date: date,
    external_product_code: str | None,
    layer_code: str,
    item_prefix: str,
    issue_flag: bool,
    complete_flag: bool,
    lock_flag: bool,
    result_status: str | None,
    match_result: bool | None,
) -> list[RpaRunItem]:
    return [
        RpaRunItem(
            run_id=run_id,
            row_no=1,
            status="New",
            jiku_code="JIKU-01",
            layer_code=layer_code,
            external_product_code=external_product_code,
            delivery_date=base_date,
            delivery_quantity=120,
            shipping_vehicle="TRUCK-1",
            issue_flag=issue_flag,
            complete_flag=complete_flag,
            match_result=match_result,
            lock_flag=lock_flag,
            item_no=f"{item_prefix}-001",
            lot_no=None,
            result_status=result_status,
        ),
        RpaRunItem(
            run_id=run_id,
            row_no=2,
            status="New",
            jiku_code="JIKU-02",
            layer_code=layer_code,
            external_product_code=external_product_code,
            delivery_date=base_date + timedelta(days=1),
            delivery_quantity=240,
            shipping_vehicle="TRUCK-2",
            issue_flag=issue_flag,
            complete_flag=complete_flag,
            match_result=match_result,
            lock_flag=lock_flag,
            item_no=f"{item_prefix}-002",
            lot_no=None,
            result_status=result_status,
        ),
    ]


def generate_rpa_material_delivery_data(db: Session) -> None:
    """Generate sample runs/items for the material delivery note pages."""
    customer_item = db.query(CustomerItem).first()
    customer_id = customer_item.customer_id if customer_item else None
    external_product_code = customer_item.external_product_code if customer_item else "EXT-0001"

    today = date.today()
    now = utcnow()

    # Step1: CSV import done
    run_step1 = RpaRun(
        rpa_type="material_delivery_note",
        status=RpaRunStatus.STEP1_DONE,
        data_start_date=today - timedelta(days=7),
        data_end_date=today - timedelta(days=1),
        started_at=now,
        created_at=now,
        updated_at=now,
        customer_id=customer_id,
    )
    db.add(run_step1)
    db.flush()
    db.add_all(
        _build_items(
            run_step1.id,
            today + timedelta(days=3),
            external_product_code,
            "L-01",
            "STEP1",
            issue_flag=True,
            complete_flag=False,
            lock_flag=False,
            result_status=None,
            match_result=None,
        )
    )

    # Step2: confirmed (ready for Step3)
    run_step2 = RpaRun(
        rpa_type="material_delivery_note",
        status=RpaRunStatus.STEP2_CONFIRMED,
        data_start_date=today - timedelta(days=14),
        data_end_date=today - timedelta(days=8),
        started_at=now - timedelta(days=2),
        step2_executed_at=now - timedelta(days=1),
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=1),
        customer_id=customer_id,
    )
    db.add(run_step2)
    db.flush()
    db.add_all(
        _build_items(
            run_step2.id,
            today + timedelta(days=5),
            external_product_code,
            "L-02",
            "STEP2",
            issue_flag=True,
            complete_flag=True,
            lock_flag=False,
            result_status=None,
            match_result=None,
        )
    )

    # Step3: running
    run_step3 = RpaRun(
        rpa_type="material_delivery_note",
        status=RpaRunStatus.STEP3_RUNNING,
        data_start_date=today - timedelta(days=20),
        data_end_date=today - timedelta(days=15),
        started_at=now - timedelta(days=3),
        step2_executed_at=now - timedelta(days=2),
        created_at=now - timedelta(days=3),
        updated_at=now - timedelta(days=2),
        customer_id=customer_id,
    )
    db.add(run_step3)
    db.flush()
    db.add_all(
        _build_items(
            run_step3.id,
            today + timedelta(days=2),
            external_product_code,
            "L-03",
            "STEP3",
            issue_flag=True,
            complete_flag=True,
            lock_flag=True,
            result_status="processing",
            match_result=None,
        )
    )

    # Step3 done -> Step4 review
    run_step4 = RpaRun(
        rpa_type="material_delivery_note",
        status=RpaRunStatus.STEP4_REVIEW,
        data_start_date=today - timedelta(days=30),
        data_end_date=today - timedelta(days=25),
        started_at=now - timedelta(days=5),
        step2_executed_at=now - timedelta(days=4),
        external_done_at=now - timedelta(days=3),
        step4_executed_at=now - timedelta(days=2),
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(days=2),
        customer_id=customer_id,
    )
    db.add(run_step4)
    db.flush()
    review_items = _build_items(
        run_step4.id,
        today + timedelta(days=1),
        external_product_code,
        "L-04",
        "STEP4",
        issue_flag=True,
        complete_flag=True,
        lock_flag=True,
        result_status="success",
        match_result=True,
    )
    review_items[1].match_result = False
    db.add_all(review_items)

    # Done
    run_done = RpaRun(
        rpa_type="material_delivery_note",
        status=RpaRunStatus.DONE,
        data_start_date=today - timedelta(days=40),
        data_end_date=today - timedelta(days=35),
        started_at=now - timedelta(days=10),
        step2_executed_at=now - timedelta(days=9),
        external_done_at=now - timedelta(days=8),
        step4_executed_at=now - timedelta(days=7),
        created_at=now - timedelta(days=10),
        updated_at=now - timedelta(days=6),
        customer_id=customer_id,
    )
    db.add(run_done)
    db.flush()
    done_items = _build_items(
        run_done.id,
        today - timedelta(days=1),
        external_product_code,
        "L-05",
        "DONE",
        issue_flag=True,
        complete_flag=True,
        lock_flag=True,
        result_status="success",
        match_result=True,
    )
    for item in done_items:
        item.sap_registered = True
        item.order_no = "SO-12345"
        item.lot_no = "LOT-TEST-001"
    db.add_all(done_items)

    db.flush()
