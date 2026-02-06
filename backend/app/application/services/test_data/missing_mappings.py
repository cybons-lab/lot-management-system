"""MissingMappingEvent test data generator."""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.missing_mapping_model import MissingMappingEvent


def generate_missing_mapping_events(db: Session) -> None:
    """Generate MissingMappingEvent test data.

    Creates mapping error events for testing data quality monitoring.
    """
    # Generate 10-30 mapping events
    num_events = random.randint(10, 30)

    event_types = [
        "delivery_place_not_found",
        "jiku_mapping_not_found",
        "supplier_mapping_not_found",
        "customer_not_found",
        "product_not_found",
    ]

    for _ in range(num_events):
        # 60% unresolved, 40% resolved
        is_resolved = random.random() < 0.4

        # Event occurred within last 90 days
        occurred_at = datetime.now(UTC) - timedelta(days=random.randint(0, 90))

        event_type = random.choice(event_types)

        # Generate context based on event type
        if event_type == "delivery_place_not_found":
            context = {
                "customer_code": f"CUST-{random.randint(1000, 9999)}",
                "delivery_place_code": f"DP-{random.randint(100, 999)}",
                "source": "order_import",
            }
        elif event_type == "jiku_mapping_not_found":
            context = {
                "customer_code": f"CUST-{random.randint(1000, 9999)}",
                "customer_part_no": f"PA-{random.randint(100, 999)}",
                "jiku_code": random.choice(["A", "B", "C", "D"]),
                "source": "smartread_ocr",
            }
        elif event_type == "supplier_mapping_not_found":
            context = {
                "maker_part_no": f"MK-{random.randint(1000, 9999)}",
                "supplier_code": f"SUP-{random.randint(100, 999)}",
                "source": "inbound_plan",
            }
        elif event_type == "customer_not_found":
            context = {
                "customer_code": f"UNKNOWN-{random.randint(1000, 9999)}",
                "source": "forecast_import",
            }
        else:  # product_not_found
            context = {
                "product_code": f"UNKNOWN-PRD-{random.randint(1000, 9999)}",
                "source": "order_import",
            }

        resolved_at = None
        resolution_note = None
        if is_resolved:
            resolved_at = occurred_at + timedelta(days=random.randint(1, 30))
            resolution_note = random.choice(
                [
                    "マスタ登録により解決",
                    "マッピング追加により解決",
                    "データ修正により解決",
                    "重複データとして無視",
                    "誤検知として無視",
                ]
            )

        event = MissingMappingEvent(
            event_type=event_type,
            context_json=context,
            occurred_at=occurred_at,
            resolved_at=resolved_at,
            resolution_note=resolution_note,
        )
        db.add(event)

    # Edge case: Events spanning multiple months
    base_date = datetime.now(UTC) - timedelta(days=180)
    for i in range(12):
        event_date = base_date + timedelta(days=i * 15)
        event = MissingMappingEvent(
            event_type="delivery_place_not_found",
            context_json={
                "customer_code": "CUST-HISTORICAL",
                "delivery_place_code": f"DP-HIST-{i}",
                "source": "historical_import",
            },
            occurred_at=event_date,
            resolved_at=event_date + timedelta(days=7) if random.random() < 0.5 else None,
            resolution_note="Historical data issue" if random.random() < 0.5 else None,
        )
        db.add(event)

    # Edge case: Bulk resolution (same day)
    resolution_date = datetime.now(UTC) - timedelta(days=10)
    for i in range(5):
        event = MissingMappingEvent(
            event_type="jiku_mapping_not_found",
            context_json={
                "customer_code": "CUST-BULK",
                "jiku_code": f"J{i}",
                "source": "bulk_import",
            },
            occurred_at=resolution_date - timedelta(days=5),
            resolved_at=resolution_date,
            resolution_note="一括マッピング追加により解決",
        )
        db.add(event)

    # Edge case: Very detailed context JSON
    event = MissingMappingEvent(
        event_type="supplier_mapping_not_found",
        context_json={
            "maker_part_no": "COMPLEX-PART-001",
            "supplier_code": "SUP-999",
            "source": "complex_import",
            "additional_info": {
                "file_name": "complex_data.xlsx",
                "row_number": 12345,
                "column": "E",
                "attempted_matches": ["SUP-998", "SUP-997", "SUP-996"],
                "error_details": "Multiple candidate suppliers found but none matched exactly",
            },
        },
        occurred_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(event)

    db.commit()
