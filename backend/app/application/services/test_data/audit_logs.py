"""Audit log and system log test data generators."""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.logs_models import (
    BatchJob,
    BusinessRule,
    MasterChangeLog,
    OperationLog,
)


def generate_lot_reservation_history(db: Session) -> None:
    """Generate LotReservationHistory test data.

    Note: This table uses database triggers to auto-populate.
    Manually generating history here for completeness.
    """
    from app.infrastructure.persistence.models.lot_reservation_history_model import (
        HistoryOperation,
        LotReservationHistory,
    )
    from app.infrastructure.persistence.models.lot_reservations_model import LotReservation

    reservations = db.query(LotReservation).limit(20).all()
    users = db.query(User).all()

    if not reservations or not users:
        return

    # Generate history for 50% of reservations
    for reservation in random.sample(reservations, len(reservations) // 2):
        # Create 2-5 history records per reservation
        num_records = random.randint(2, 5)
        base_date = datetime.now(UTC) - timedelta(days=30)

        for i in range(num_records):
            changed_at = base_date + timedelta(days=i * (30 // num_records))

            if i == 0:
                # INSERT operation
                operation = HistoryOperation.INSERT
                old_values = None
                new_values = {
                    "lot_id": reservation.lot_id,
                    "reserved_qty": str(reservation.reserved_qty),
                    "status": reservation.status,
                }
            elif i == num_records - 1 and random.random() < 0.3:
                # DELETE operation (30% chance on last record)
                operation = HistoryOperation.DELETE
                old_values = {
                    "lot_id": reservation.lot_id,
                    "reserved_qty": str(reservation.reserved_qty),
                    "status": reservation.status,
                }
                new_values = None
            else:
                # UPDATE operation
                operation = HistoryOperation.UPDATE
                old_qty = float(reservation.reserved_qty) * random.uniform(0.8, 1.2)
                old_values = {
                    "reserved_qty": f"{old_qty:.2f}",
                    "status": random.choice(["active", "confirmed", "cancelled"]),
                }
                new_values = {
                    "reserved_qty": str(reservation.reserved_qty),
                    "status": reservation.status,
                }

            history = LotReservationHistory(
                reservation_id=reservation.id,
                lot_id=reservation.lot_id,
                operation=operation,
                old_values=old_values,
                new_values=new_values,
                changed_at=changed_at,
                changed_by=random.choice(users).id if users else None,
            )
            db.add(history)

    # Edge case: Many operations on same reservation (10+ records)
    if reservations:
        busy_reservation = reservations[0]
        base_date = datetime.now(UTC) - timedelta(days=7)
        for i in range(12):
            history = LotReservationHistory(
                reservation_id=busy_reservation.id,
                lot_id=busy_reservation.lot_id,
                operation=HistoryOperation.UPDATE,
                old_values={"reserved_qty": str(100 + i * 10), "status": "active"},
                new_values={"reserved_qty": str(100 + (i + 1) * 10), "status": "active"},
                changed_at=base_date + timedelta(hours=i * 2),
                changed_by=random.choice(users).id if users else None,
            )
            db.add(history)

    db.commit()


def generate_operation_logs(db: Session) -> None:
    """Generate OperationLog test data."""
    users = db.query(User).all()

    if not users:
        return

    # Generate 50-100 operation logs
    num_logs = random.randint(50, 100)

    operations = ["create", "update", "delete", "login", "logout", "export"]
    target_tables = [
        "orders",
        "forecasts",
        "lots",
        "customer_items",
        "inbound_plans",
        "adjustments",
    ]

    for _ in range(num_logs):
        user = random.choice(users)
        operation = random.choice(operations)

        # Timestamp within last 90 days
        timestamp = datetime.now(UTC) - timedelta(days=random.randint(0, 90))

        target_table = (
            random.choice(target_tables) if operation in ["create", "update", "delete"] else None
        )
        target_id = random.randint(1, 1000) if target_table else None

        changes = None
        if operation in ["create", "update"]:
            changes = {
                "before": {"status": "draft", "quantity": 100} if operation == "update" else None,
                "after": {"status": "confirmed", "quantity": 150},
            }

        log = OperationLog(
            user_id=user.id,
            operation=operation,
            target_table=target_table,
            target_id=target_id,
            changes=changes,
            ip_address=f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
            timestamp=timestamp,
        )
        db.add(log)

    # Edge case: Many logs from same user (100+ operations)
    if users:
        power_user = users[0]
        for i in range(120):
            log = OperationLog(
                user_id=power_user.id,
                operation=random.choice(operations),
                target_table=random.choice(target_tables),
                target_id=i,
                timestamp=datetime.now(UTC) - timedelta(hours=i),
                ip_address="192.168.1.100",
            )
            db.add(log)

    db.commit()


def generate_master_change_logs(db: Session) -> None:
    """Generate MasterChangeLog test data."""
    users = db.query(User).all()

    if not users:
        return

    # Generate 20-50 master change logs
    num_logs = random.randint(20, 50)

    master_tables = ["customers", "suppliers", "warehouses", "makers", "customer_items"]
    change_types = ["insert", "update", "delete"]

    for _ in range(num_logs):
        user = random.choice(users)
        table_name = random.choice(master_tables)
        change_type = random.choice(change_types)

        timestamp = datetime.now(UTC) - timedelta(days=random.randint(0, 180))

        old_values = (
            {"code": f"OLD-{random.randint(100, 999)}", "name": "旧名称"}
            if change_type in ["update", "delete"]
            else None
        )
        new_values = (
            {"code": f"NEW-{random.randint(100, 999)}", "name": "新名称"}
            if change_type in ["insert", "update"]
            else None
        )

        log = MasterChangeLog(
            table_name=table_name,
            record_id=random.randint(1, 500),
            change_type=change_type,
            old_values=old_values,
            new_values=new_values,
            changed_by=user.id,
            changed_at=timestamp,
        )
        db.add(log)

    db.commit()


def generate_business_rules(db: Session) -> None:
    """Generate BusinessRule test data."""
    rules = [
        {
            "code": "allocation_fefo_strict",
            "name": "FEFO厳格モード",
            "rule_type": "allocation",
            "is_active": True,
            "parameters": {"strict_expiry": True, "allow_partial": False},
            "description": "期限切れ優先引当（厳格モード）",
        },
        {
            "code": "expiry_warning_30days",
            "name": "期限切れ警告（30日前）",
            "rule_type": "expiry_warning",
            "is_active": True,
            "parameters": {"warning_days": 30, "alert_users": True},
            "description": "期限切れ30日前に警告通知",
        },
        {
            "code": "kanban_auto_replenish",
            "name": "かんばん自動発注",
            "rule_type": "kanban",
            "is_active": False,
            "parameters": {"trigger_qty": 100, "order_qty": 500},
            "description": "在庫が100を下回ったら500発注",
        },
        {
            "code": "inventory_sync_alert",
            "name": "在庫同期アラート",
            "rule_type": "inventory_sync_alert",
            "is_active": True,
            "parameters": {"threshold_hours": 24, "alert_admin": True},
            "description": "24時間同期されていない場合アラート",
        },
    ]

    for rule_data in rules:
        rule = BusinessRule(**rule_data)
        db.add(rule)

    # Edge case: Rule with complex parameters
    rule = BusinessRule(
        code="allocation_complex",
        name="複雑な引当ルール",
        rule_type="allocation",
        is_active=True,
        parameters={
            "mode": "hybrid",
            "fefo_weight": 0.7,
            "fifo_weight": 0.3,
            "warehouse_priority": ["WH-01", "WH-02", "WH-03"],
            "exclude_expired": True,
            "partial_allocation_threshold": 0.8,
            "reservation_hold_hours": 48,
        },
        description="FEFOとFIFOを組み合わせた複雑な引当ルール",
    )
    db.add(rule)

    db.commit()


def generate_batch_jobs(db: Session) -> None:
    """Generate BatchJob test data."""
    # Generate 20-40 batch jobs
    num_jobs = random.randint(20, 40)

    job_types = [
        "allocation_suggestion",
        "allocation_finalize",
        "inventory_sync",
        "data_import",
        "report_generation",
        "forecast_calculation",
    ]

    for _ in range(num_jobs):
        job_type = random.choice(job_types)

        # 40% pending, 30% completed, 20% failed, 10% running
        status = random.choices(
            [
                "pending",
                "running",
                "completed",
                "failed",
            ],
            weights=[40, 10, 30, 20],
            k=1,
        )[0]

        created_at = datetime.now(UTC) - timedelta(days=random.randint(0, 90))

        started_at = None
        completed_at = None
        error_message = None
        result_message = None

        if status in ["running", "completed", "failed"]:
            started_at = created_at + timedelta(minutes=random.randint(1, 30))

        if status in ["completed", "failed"] and started_at is not None:
            completed_at = started_at + timedelta(minutes=random.randint(1, 120))

        if status == "completed":
            result_message = f"Successfully processed {random.randint(100, 5000)} records"
        elif status == "failed":
            error_message = random.choice(
                [
                    "Database connection timeout",
                    "Invalid data format in row 123",
                    "Memory limit exceeded",
                    "External API returned 500 error",
                ]
            )

        job = BatchJob(
            job_type=job_type,
            status=status,
            parameters={"mode": "auto", "scope": "all"},
            created_at=created_at,
            started_at=started_at,
            completed_at=completed_at,
            result_message=result_message,
            error_message=error_message,
        )
        db.add(job)

    # Edge case: Long-running job (hours)
    long_job = BatchJob(
        job_type="report_generation",
        status="running",
        parameters={"report_type": "annual", "year": 2025},
        created_at=datetime.now(UTC) - timedelta(hours=5),
        started_at=datetime.now(UTC) - timedelta(hours=4, minutes=50),
    )
    db.add(long_job)

    # Edge case: Job with large result message
    large_result_job = BatchJob(
        job_type="data_import",
        status="completed",
        parameters={"file": "large_import.csv"},
        created_at=datetime.now(UTC) - timedelta(days=1),
        started_at=datetime.now(UTC) - timedelta(days=1, hours=-1),
        completed_at=datetime.now(UTC) - timedelta(days=1, hours=-2),
        result_message="Imported 50000 records. " + "Details: " * 50,
    )
    db.add(large_result_job)

    db.commit()
