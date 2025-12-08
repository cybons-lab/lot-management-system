"""SAP integration service for fetching purchase orders (mock implementation).

This module provides a mock implementation of SAP purchase order
integration. In the future, this will be replaced with actual SAP
RFC/API calls.
"""

from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inbound_models import InboundPlan, InboundPlanLine
from app.presentation.schemas.inventory.inbound_schema import InboundPlanDetailResponse


class SAPService:
    """Service for SAP integration (purchase and sales orders).

    Current implementation (Phase 1):
    - Purchase Order (PO) fetching from SAP (mock)
    - Sync PO data to InboundPlans

    Future extensions:
    - Sales Order (SO) sending to SAP after allocation
    - Real SAP RFC/API integration (replace mock)
    """

    def __init__(self, db: Session):
        """Initialize SAP service.

        Args:
            db: Database session
        """
        self.db = db

    def fetch_purchase_orders_from_sap(self) -> list[dict]:
        """Fetch purchase orders from SAP (mock implementation).

        In production, this would call SAP RFC/API to retrieve actual purchase orders.
        For now, this generates mock data for testing purposes.

        Returns:
            List of purchase order dictionaries with the following structure:
            {
                "po_number": str,
                "supplier_id": int,
                "expected_date": date,
                "lines": [
                    {
                        "product_id": int,
                        "quantity": Decimal,
                        "unit": str
                    }
                ]
            }
        """
        # TODO: Replace with actual SAP API integration
        # For now, generate 2-5 random mock purchase orders
        num_orders = random.randint(2, 5)
        mock_orders = []

        base_date = date.today()

        for i in range(num_orders):
            # Random expected delivery date (7-30 days from now)
            days_offset = random.randint(7, 30)
            expected_date = base_date + timedelta(days=days_offset)

            # Random supplier (1-5)
            supplier_id = random.randint(1, 5)

            # Generate PO number
            po_number = f"PO-{base_date.strftime('%Y%m%d')}-{i + 1:03d}"

            # Generate 1-3 line items per PO
            num_lines = random.randint(1, 3)
            lines = []

            for _ in range(num_lines):
                # Random product (assume IDs 1-50 exist)
                product_id = random.randint(1, 50)

                # Random quantity (10-500)
                quantity = Decimal(str(random.randint(10, 500)))

                # Random unit (assume common units)
                unit = random.choice(["KG", "PCS", "BOX", "CAN"])

                lines.append({"product_id": product_id, "quantity": quantity, "unit": unit})

            mock_orders.append(
                {
                    "po_number": po_number,
                    "supplier_id": supplier_id,
                    "expected_date": expected_date,
                    "lines": lines,
                }
            )

        return mock_orders

    def sync_purchase_orders_to_inbound_plans(
        self,
    ) -> tuple[list[InboundPlanDetailResponse], int]:
        """Sync SAP purchase orders to inbound plans.

        Fetches purchase orders from SAP (mock) and creates corresponding InboundPlans.
        Skips POs that already exist (based on plan_number).

        Returns:
            Tuple of (list of created inbound plans, number of skipped POs)
        """
        # Fetch mock PO data
        purchase_orders = self.fetch_purchase_orders_from_sap()

        created_plans = []
        skipped_count = 0

        for po in purchase_orders:
            # Check if this PO already exists
            existing_plan = (
                self.db.query(InboundPlan)
                .filter(InboundPlan.plan_number == po["po_number"])
                .first()
            )

            if existing_plan:
                skipped_count += 1
                continue

            # Create InboundPlan
            db_plan = InboundPlan(
                plan_number=po["po_number"],
                supplier_id=po["supplier_id"],
                planned_arrival_date=po["expected_date"],
                status="planned",
                notes=f"SAP連携により自動作成 ({date.today()})",
            )

            self.db.add(db_plan)
            self.db.flush()  # Get plan ID

            # Create InboundPlanLines
            created_lines = []
            for line_data in po["lines"]:
                db_line = InboundPlanLine(
                    inbound_plan_id=db_plan.id,
                    product_id=line_data["product_id"],
                    planned_quantity=line_data["quantity"],
                    unit=line_data["unit"],
                )
                self.db.add(db_line)
                created_lines.append(db_line)

            self.db.commit()
            self.db.refresh(db_plan)

            # Refresh lines to get IDs
            for line in created_lines:
                self.db.refresh(line)

            # Convert to response schema
            from app.presentation.schemas.inventory.inbound_schema import (
                InboundPlanDetailResponse,
                InboundPlanLineResponse,
                InboundPlanStatus,
            )

            created_plans.append(
                InboundPlanDetailResponse(
                    id=db_plan.id,
                    plan_number=db_plan.plan_number,
                    supplier_id=db_plan.supplier_id,
                    planned_arrival_date=db_plan.planned_arrival_date,
                    status=InboundPlanStatus(db_plan.status),
                    notes=db_plan.notes,
                    created_at=db_plan.created_at,
                    updated_at=db_plan.updated_at,
                    lines=[
                        InboundPlanLineResponse(
                            id=line.id,
                            inbound_plan_id=line.inbound_plan_id,
                            product_id=line.product_id,
                            planned_quantity=line.planned_quantity,
                            unit=line.unit,
                            created_at=line.created_at,
                            updated_at=line.updated_at,
                            expected_lots=[],
                        )
                        for line in created_lines
                    ],
                )
            )

        return created_plans, skipped_count
