#!/usr/bin/env python3
"""Seed minimal test data for jiku pattern matching verification.

Creates/updates:
- customer (customer_code)
- delivery_place (jiku_code + jiku_match_pattern)
- shipping_master_curated rows
- smartread_config (default if missing)
- smartread_long_data sample rows

Goal:
- Verify fallback: OCR次区=2140 matches jiku_match_pattern=2*** and resolves to jiku_code=N033
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, date, datetime


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
from sqlalchemy import select


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import SessionLocal  # noqa: E402
from app.infrastructure.persistence.models.masters_models import (  # noqa: E402
    Customer,
    DeliveryPlace,
)
from app.infrastructure.persistence.models.shipping_master_models import (  # noqa: E402
    ShippingMasterCurated,
)
from app.infrastructure.persistence.models.smartread_models import (  # noqa: E402
    SmartReadConfig,
    SmartReadLongData,
)


CUSTOMER_CODE = "100427105"
CUSTOMER_NAME = "Pattern Test Customer"
MATERIAL_CODE_PATTERN = "PAT-M001"
MATERIAL_CODE_EXACT = "PAT-M002"
JIKU_CANONICAL = "N033"
JIKU_PATTERN = "2***"
DELIVERY_PLACE_CODE = "DP-N033"
DELIVERY_PLACE_NAME = "Pattern Delivery Place"


def get_or_create_customer(db):
    customer = db.execute(
        select(Customer).where(Customer.customer_code == CUSTOMER_CODE)
    ).scalar_one_or_none()
    if customer:
        if not customer.customer_name:
            customer.customer_name = CUSTOMER_NAME
        return customer

    customer = Customer(customer_code=CUSTOMER_CODE, customer_name=CUSTOMER_NAME)
    db.add(customer)
    db.flush()
    return customer


def upsert_delivery_place(db, customer_id: int):
    dp = db.execute(
        select(DeliveryPlace).where(
            DeliveryPlace.customer_id == customer_id,
            DeliveryPlace.delivery_place_code == DELIVERY_PLACE_CODE,
        )
    ).scalar_one_or_none()

    if not dp:
        dp = DeliveryPlace(
            customer_id=customer_id,
            delivery_place_code=DELIVERY_PLACE_CODE,
            delivery_place_name=DELIVERY_PLACE_NAME,
            jiku_code=JIKU_CANONICAL,
            jiku_match_pattern=JIKU_PATTERN,
            display_name=DELIVERY_PLACE_NAME,
        )
        db.add(dp)
        db.flush()
        return dp

    dp.delivery_place_name = DELIVERY_PLACE_NAME
    dp.display_name = DELIVERY_PLACE_NAME
    dp.jiku_code = JIKU_CANONICAL
    dp.jiku_match_pattern = JIKU_PATTERN
    return dp


def upsert_shipping_master(db):
    rows = [
        {
            "material_code": MATERIAL_CODE_PATTERN,
            "jiku_code": JIKU_CANONICAL,
            "jiku_match_pattern": JIKU_PATTERN,
            "shipping_slip_text": "PATTERN-MATCH-SLIP",
        },
        {
            "material_code": MATERIAL_CODE_EXACT,
            "jiku_code": JIKU_CANONICAL,
            "jiku_match_pattern": None,
            "shipping_slip_text": "EXACT-MATCH-SLIP",
        },
    ]

    for row in rows:
        existing = db.execute(
            select(ShippingMasterCurated).where(
                ShippingMasterCurated.customer_code == CUSTOMER_CODE,
                ShippingMasterCurated.material_code == row["material_code"],
                ShippingMasterCurated.jiku_code == row["jiku_code"],
            )
        ).scalar_one_or_none()

        if existing:
            existing.jiku_match_pattern = row["jiku_match_pattern"]
            existing.delivery_place_code = DELIVERY_PLACE_CODE
            existing.delivery_place_name = DELIVERY_PLACE_NAME
            existing.shipping_slip_text = row["shipping_slip_text"]
            existing.customer_name = CUSTOMER_NAME
            existing.updated_at = datetime.now(UTC)
            continue

        db.add(
            ShippingMasterCurated(
                customer_code=CUSTOMER_CODE,
                material_code=row["material_code"],
                jiku_code=row["jiku_code"],
                jiku_match_pattern=row["jiku_match_pattern"],
                customer_name=CUSTOMER_NAME,
                delivery_place_code=DELIVERY_PLACE_CODE,
                delivery_place_name=DELIVERY_PLACE_NAME,
                shipping_slip_text=row["shipping_slip_text"],
                has_order=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )


def get_or_create_smartread_config(db):
    config = db.execute(
        select(SmartReadConfig).where(SmartReadConfig.is_default.is_(True))
    ).scalar_one_or_none()
    if config:
        return config

    config = SmartReadConfig(
        name="Pattern Test Config",
        endpoint="https://dummy.smartread.local",
        api_key="dummy",
        export_type="json",
        is_active=True,
        is_default=True,
    )
    db.add(config)
    db.flush()
    return config


def seed_smartread_long_data(db, config_id: int):
    today = date.today()
    samples = [
        {
            "task_id": f"PATTERN_TEST_{today.strftime('%Y%m%d')}",
            "row_index": 1,
            "content": {
                "得意先コード": CUSTOMER_CODE,
                "材質コード": MATERIAL_CODE_PATTERN,
                "次区": "2140",
                "納期": today.isoformat(),
                "納入量": "100",
            },
            "memo": "pattern fallback expected (2140 -> N033)",
        },
        {
            "task_id": f"PATTERN_TEST_{today.strftime('%Y%m%d')}",
            "row_index": 2,
            "content": {
                "得意先コード": CUSTOMER_CODE,
                "材質コード": MATERIAL_CODE_EXACT,
                "次区": JIKU_CANONICAL,
                "納期": today.isoformat(),
                "納入量": "200",
            },
            "memo": "exact match expected",
        },
    ]

    # avoid duplicate on repeated runs
    for sample in samples:
        exists = db.execute(
            select(SmartReadLongData).where(
                SmartReadLongData.config_id == config_id,
                SmartReadLongData.task_date == today,
                SmartReadLongData.task_id == sample["task_id"],
                SmartReadLongData.row_index == sample["row_index"],
            )
        ).scalar_one_or_none()
        if exists:
            exists.content = sample["content"]
            exists.error_reason = sample["memo"]
            continue

        db.add(
            SmartReadLongData(
                config_id=config_id,
                task_id=sample["task_id"],
                task_date=today,
                row_index=sample["row_index"],
                content=sample["content"],
                status="PENDING",
                error_reason=sample["memo"],
            )
        )


def main():
    db = SessionLocal()
    try:
        customer = get_or_create_customer(db)
        dp = upsert_delivery_place(db, customer.id)
        upsert_shipping_master(db)
        config = get_or_create_smartread_config(db)
        seed_smartread_long_data(db, config.id)

        db.commit()

        print("✅ Seeded jiku pattern test data")
        print(f"- customer_code: {CUSTOMER_CODE}")
        print(
            f"- delivery_place: {dp.delivery_place_code} / jiku={dp.jiku_code} / pattern={dp.jiku_match_pattern}"
        )
        print(
            f"- shipping_master: ({MATERIAL_CODE_PATTERN}, {JIKU_CANONICAL}, pattern={JIKU_PATTERN})"
        )
        print(f"- smartread_long_data sample: material={MATERIAL_CODE_PATTERN}, jiku=2140")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
