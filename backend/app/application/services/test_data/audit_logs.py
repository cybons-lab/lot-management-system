"""Audit log and system log test data generators."""

import random
from datetime import UTC, datetime, timedelta
from decimal import Decimal

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

    statuses = ["active", "confirmed", "released"]

    # Generate history for 50% of reservations
    for reservation in random.sample(reservations, len(reservations) // 2):
        # Create 2-5 history records per reservation
        num_records = random.randint(2, 5)
        base_date = datetime.now(UTC) - timedelta(days=30)

        for i in range(num_records):
            changed_at = base_date + timedelta(days=i * (30 // num_records))
            user_name = random.choice(users).username if users else None

            if i == 0:
                # INSERT operation: new values only
                history = LotReservationHistory(
                    reservation_id=reservation.id,
                    operation=HistoryOperation.INSERT,
                    lot_id=reservation.lot_id,
                    source_type=reservation.source_type,
                    source_id=reservation.source_id,
                    reserved_qty=reservation.reserved_qty,
                    status=reservation.status,
                    changed_at=changed_at,
                    changed_by=user_name,
                )
            elif i == num_records - 1 and random.random() < 0.3:
                # DELETE operation: old values only
                history = LotReservationHistory(
                    reservation_id=reservation.id,
                    operation=HistoryOperation.DELETE,
                    old_lot_id=reservation.lot_id,
                    old_source_type=reservation.source_type,
                    old_source_id=reservation.source_id,
                    old_reserved_qty=reservation.reserved_qty,
                    old_status=reservation.status,
                    changed_at=changed_at,
                    changed_by=user_name,
                )
            else:
                # UPDATE operation: both old and new values
                old_qty = float(reservation.reserved_qty) * random.uniform(0.8, 1.2)
                history = LotReservationHistory(
                    reservation_id=reservation.id,
                    operation=HistoryOperation.UPDATE,
                    lot_id=reservation.lot_id,
                    reserved_qty=reservation.reserved_qty,
                    status=reservation.status,
                    old_lot_id=reservation.lot_id,
                    old_reserved_qty=round(Decimal(old_qty), 3),
                    old_status=random.choice(statuses),
                    changed_at=changed_at,
                    changed_by=user_name,
                )
            db.add(history)

    # Edge case: Many operations on same reservation (10+ records)
    if reservations:
        busy_reservation = reservations[0]
        base_date = datetime.now(UTC) - timedelta(days=7)
        for i in range(12):
            history = LotReservationHistory(
                reservation_id=busy_reservation.id,
                operation=HistoryOperation.UPDATE,
                lot_id=busy_reservation.lot_id,
                reserved_qty=Decimal(100 + (i + 1) * 10),
                status="active",
                old_lot_id=busy_reservation.lot_id,
                old_reserved_qty=Decimal(100 + i * 10),
                old_status="active",
                changed_at=base_date + timedelta(hours=i * 2),
                changed_by=random.choice(users).username if users else None,
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

        # target_table is NOT NULL, so always provide a value
        if operation in ["create", "update", "delete"]:
            target_table = random.choice(target_tables)
        else:
            target_table = "sessions"  # login/logout/export use 'sessions'

        target_id = random.randint(1, 1000) if operation in ["create", "update", "delete"] else None

        changes = None
        if operation in ["create", "update"]:
            changes = {
                "before": {"status": "draft", "quantity": 100} if operation == "update" else None,
                "after": {"status": "confirmed", "quantity": 150},
            }

        log = OperationLog(
            user_id=user.id,
            operation_type=operation,
            target_table=target_table,
            target_id=target_id,
            changes=changes,
            ip_address=f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
            created_at=timestamp,
        )
        db.add(log)

    # Edge case: Many logs from same user (100+ operations)
    if users:
        power_user = users[0]
        for i in range(120):
            log = OperationLog(
                user_id=power_user.id,
                operation_type=random.choice(operations),
                target_table=random.choice(target_tables),
                target_id=i,
                created_at=datetime.now(UTC) - timedelta(hours=i),
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
            "rule_code": "allocation_fefo_strict",
            "rule_name": "FEFO厳格モード",
            "rule_type": "allocation",
            "is_active": True,
            "rule_parameters": {"strict_expiry": True, "allow_partial": False},
        },
        {
            "rule_code": "expiry_warning_30days",
            "rule_name": "期限切れ警告（30日前）",
            "rule_type": "expiry_warning",
            "is_active": True,
            "rule_parameters": {"warning_days": 30, "alert_users": True},
        },
        {
            "rule_code": "kanban_auto_replenish",
            "rule_name": "かんばん自動発注",
            "rule_type": "kanban",
            "is_active": False,
            "rule_parameters": {"trigger_qty": 100, "order_qty": 500},
        },
        {
            "rule_code": "inventory_sync_alert",
            "rule_name": "在庫同期アラート",
            "rule_type": "inventory_sync_alert",
            "is_active": True,
            "rule_parameters": {"threshold_hours": 24, "alert_admin": True},
        },
    ]

    for rule_data in rules:
        rule = BusinessRule(**rule_data)
        db.add(rule)

    # Edge case: Rule with complex parameters
    rule = BusinessRule(
        rule_code="allocation_complex",
        rule_name="複雑な引当ルール",
        rule_type="allocation",
        is_active=True,
        rule_parameters={
            "mode": "hybrid",
            "fefo_weight": 0.7,
            "fifo_weight": 0.3,
            "warehouse_priority": ["WH-01", "WH-02", "WH-03"],
            "exclude_expired": True,
            "partial_allocation_threshold": 0.8,
            "reservation_hold_hours": 48,
        },
    )
    db.add(rule)

    db.commit()


# Map job_type to readable job_name
JOB_NAME_MAP = {
    "allocation_suggestion": "引当候補算出",
    "allocation_finalize": "引当確定処理",
    "inventory_sync": "在庫同期",
    "data_import": "データインポート",
    "report_generation": "レポート生成",
}


def generate_batch_jobs(db: Session) -> None:
    """Generate BatchJob test data."""
    # Generate 20-40 batch jobs
    num_jobs = random.randint(20, 40)

    # Only use job_types that pass the CHECK constraint
    job_types = [
        "allocation_suggestion",
        "allocation_finalize",
        "inventory_sync",
        "data_import",
        "report_generation",
    ]

    for _ in range(num_jobs):
        job_type = random.choice(job_types)

        # 40% pending, 30% completed, 20% failed, 10% running
        status = random.choices(
            ["pending", "running", "completed", "failed"],
            weights=[40, 10, 30, 20],
            k=1,
        )[0]

        created_at = datetime.now(UTC) - timedelta(days=random.randint(0, 90))

        started_at = None
        completed_at = None
        result_message = None

        if status in ["running", "completed", "failed"]:
            started_at = created_at + timedelta(minutes=random.randint(1, 30))

        if status in ["completed", "failed"] and started_at is not None:
            completed_at = started_at + timedelta(minutes=random.randint(1, 120))

        if status == "completed":
            result_message = f"Successfully processed {random.randint(100, 5000)} records"
        elif status == "failed":
            result_message = random.choice(
                [
                    "Database connection timeout",
                    "Invalid data format in row 123",
                    "Memory limit exceeded",
                    "External API returned 500 error",
                ]
            )

        job = BatchJob(
            job_name=JOB_NAME_MAP.get(job_type, job_type),
            job_type=job_type,
            status=status,
            parameters={"mode": "auto", "scope": "all"},
            created_at=created_at,
            started_at=started_at,
            completed_at=completed_at,
            result_message=result_message,
        )
        db.add(job)

    # Edge case: Long-running job (hours)
    long_job = BatchJob(
        job_name="レポート生成（年次）",
        job_type="report_generation",
        status="running",
        parameters={"report_type": "annual", "year": 2025},
        created_at=datetime.now(UTC) - timedelta(hours=5),
        started_at=datetime.now(UTC) - timedelta(hours=4, minutes=50),
    )
    db.add(long_job)

    # Edge case: Job with large result message
    large_result_job = BatchJob(
        job_name="大量データインポート",
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
