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

    【設計意図】なぜモック実装から始めるのか:

    1. フェーズド開発アプローチ
       現状: Phase 1 - システム内部のロット管理基盤を構築
       将来: Phase 2 - SAP連携を本格実装
       理由: SAP連携は複雑（RFC設定、VPN、認証等）
       → まずはシステム単独で動作する状態を作り、後から連携を追加
       → 段階的リスク軽減

    2. 本番SAP環境への影響回避
       理由: 開発中に誤って本番SAPにデータを送信するリスクを避ける
       → モック実装で十分にテスト・検証してから、本番接続を有効化
       → 安全な開発サイクル

    3. インターフェース設計の先行確定
       メリット: モック実装を通じて、どのようなデータ構造が必要かを明確化
       → 実際のSAP API仕様が確定する前に、システム側のI/Fを固められる
       → SAP側の準備待ちで開発がブロックされない

    4. テスト容易性
       理由: モック実装なら、任意のテストデータを自由に生成可能
       → SAP環境なしでCIテストが実行できる
       → 開発者のローカル環境でも動作確認可能

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
                        "supplier_item_id": int,
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
                supplier_item_id = random.randint(1, 50)

                # Random quantity (10-500)
                quantity = Decimal(str(random.randint(10, 500)))

                # Random unit (assume common units)
                unit = random.choice(["KG", "PCS", "BOX", "CAN"])

                lines.append(
                    {"supplier_item_id": supplier_item_id, "quantity": quantity, "unit": unit}
                )

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

        【設計意図】なぜflush()とcommit()を分けて使うのか:

        1. flush() - InboundPlan作成後（行153）
           理由: InboundPlanLineを作成する際に、inbound_plan_idが必要
           → flush()でSQLを発行してIDを取得するが、まだコミットしない
           → 明細行の作成に失敗したら、ヘッダーも含めてロールバック可能

        2. commit() - 1件のPO全体の登録完了後（行159）
           理由: ヘッダー + 複数明細を1トランザクションで確定
           → 部分的なコミット（ヘッダーだけ登録されて明細が未登録）を防ぐ
           → データ整合性の保証

        3. なぜループ全体をまとめてコミットしないのか
           理由: PO単位でコミットすることで、1件のPOで失敗しても他のPOは登録される
           例: PO1成功、PO2失敗（supplier_item_idが存在しない）、PO3成功
           → PO1とPO3は登録され、PO2のみスキップ
           トレードオフ: トランザクション数が増えるが、部分的な成功が可能

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
            self.db.flush()  # Get plan ID (but don't commit yet)

            # Create InboundPlanLines
            created_lines = []
            for line_data in po["lines"]:
                db_line = InboundPlanLine(
                    inbound_plan_id=db_plan.id,
                    supplier_item_id=line_data["supplier_item_id"],
                    planned_quantity=line_data["quantity"],
                    unit=line_data["unit"],
                )
                self.db.add(db_line)
                created_lines.append(db_line)

            self.db.commit()  # Commit the entire PO (header + lines)
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
                            supplier_item_id=line.supplier_item_id,
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
