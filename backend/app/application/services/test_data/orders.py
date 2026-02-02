import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    DeliveryPlace,
)
from app.infrastructure.persistence.models.order_groups_models import OrderGroup
from app.infrastructure.persistence.models.orders_models import Order, OrderLine
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

from .inventory import get_any_lot_id
from .scenarios.stockout_scenarios import STOCKOUT_SCENARIOS


def generate_orders(
    db: Session,
    customers: list[Customer],
    products: list[SupplierItem],
    products_with_forecast: list[SupplierItem],
    delivery_places: list[DeliveryPlace],
    options: object = None,
    calendar: object = None,
):
    """Generate orders based on forecast data.

    Strategy:
    - Query daily forecasts from forecast_current table
    - For each forecast entry, create an order line with:
      - delivery_date = forecast_date
      - quantity ≈ forecast_quantity (with variance)
    - 80% normal scenario, 20% anomaly scenarios
    """
    # Get all daily forecasts (where forecast_date is set)
    forecasts = (
        db.query(ForecastCurrent)
        .filter(
            ForecastCurrent.forecast_date.isnot(None),
            ForecastCurrent.forecast_quantity > 0,
        )
        .all()
    )

    print(f"[INFO] Found {len(forecasts)} daily forecasts to generate orders from")

    stockout_enabled = False
    if (
        options
        and hasattr(options, "include_stockout_scenarios")
        and options.include_stockout_scenarios
    ):
        stockout_enabled = True

    # Group forecasts: create one order per (customer, date) with multiple lines
    # Key: (customer_id, order_date) -> list of forecasts
    order_groups: dict[tuple[int, date], list[ForecastCurrent]] = {}

    for fc in forecasts:
        key = (fc.customer_id, fc.forecast_date)
        if key not in order_groups:
            order_groups[key] = []
        order_groups[key].append(fc)

    print(f"[INFO] Grouped into {len(order_groups)} orders")

    order_count = 0
    line_count = 0

    # Track OrderGroups to avoid uniqueness violation if multiple runs (though we usually clear data)
    # Key: (customer_id, supplier_item_id, order_date) -> OrderGroup.id
    order_group_map: dict[tuple[int, int, date], int] = {}

    for (customer_id, _order_date), fc_list in order_groups.items():
        # Find customer
        customer = next((c for c in customers if c.id == customer_id), None)
        if not customer:
            continue

        # Determine Order Type Context for this whole Order
        # 80% Actual Order (from OCR), 20% Forecast Linked (Provisional)
        is_forecast_linked = random.random() < 0.20

        ocr_filename = None
        base_order_type = "FORECAST_LINKED"

        if not is_forecast_linked:
            # It's an actual order. Determine subtype.
            base_order_type = random.choices(
                ["ORDER", "KANBAN", "SPOT"],
                weights=[75, 20, 5],
                k=1,
            )[0]
            # Generate fake OCR filename
            ocr_filename = f"OCR_{date.today().strftime('%Y%m%d')}_{random.randint(1000, 9999)}.pdf"

        # Create Order Header
        order_date = date.today()
        if calendar and hasattr(calendar, "adjust_date"):
            order_date = calendar.adjust_date(
                order_date, forward=False
            )  # Use previous business day if today is holiday

        order = Order(
            customer_id=customer_id,
            order_date=order_date,
            ocr_source_filename=ocr_filename,
            status="open",  # Default
        )
        db.add(order)
        db.flush()
        order_count += 1

        # Determine Order Group if applicable (Only for Actual Orders)
        og_id = None
        if not is_forecast_linked:
            # Create OrderGroup for this batch
            # Note: We create one OG per Order for simplicity in test data
            og = OrderGroup(
                customer_id=customer_id,
                # supplier_item_id is nullable in OrderGroup? The model snippet didn't show it clearly but
                # in loop L182 it was set. Let's assume OrderGroup can be per-order or per-product-order.
                # In L175 existing code: og_key = (customer_id, fc.supplier_item_id, order.order_date)
                # This implies one OG per Product in the existing logic.
                # If we want to group lines into one OG, we need to check if OG has supplier_item_id.
                # Let's check existing usage: "supplier_item_id=fc.supplier_item_id" (L182).
                # This means OrderGroup is partitioned by Product.
                # So we must create OGs inside the loop if we want to follow that pattern.
                # BUT, usually an OrderGroup (Batch) contains multiple products.
                # If the current model enforces supplier_item_id on OrderGroup, that's restrictive.
                # Let's look at L14 in orders.py imports -> OrderGroup is imported.
                # Assuming supplier_item_id IS required on OrderGroup based on previous code.
                # So we will resolve OG inside the loop.
                order_date=order.order_date,
                source_file_name=ocr_filename,  # Use the same filename for all products in this order
            )
            # Actually, we can't create it here if it needs supplier_item_id.
            pass

        # Create OrderLines from forecasts
        for fc in fc_list:
            # Get product for unit info
            product = next((p for p in products if p.id == fc.supplier_item_id), None)
            if not product:
                continue

            # Base quantity from forecast
            base_qty = fc.forecast_quantity

            # Determine delivery date and quantity based on scenario
            delivery_date = fc.forecast_date
            if calendar and hasattr(calendar, "adjust_date"):
                delivery_date = calendar.adjust_date(delivery_date)

            qty = base_qty

            # 90% match forecast exactly, 10% variance
            has_variance = random.random() < 0.10

            if has_variance:
                anomaly = random.choices(
                    ["qty_high", "qty_low", "early", "late"],
                    weights=[30, 30, 20, 20],
                    k=1,
                )[0]

                if anomaly == "qty_high":
                    qty = base_qty * Decimal(str(random.uniform(1.10, 1.30)))
                elif anomaly == "qty_low":
                    qty = base_qty * Decimal(str(random.uniform(0.70, 0.90)))
                elif anomaly == "early":
                    delivery_date = fc.forecast_date - timedelta(days=random.randint(1, 2))
                    if calendar and hasattr(calendar, "adjust_date"):
                        delivery_date = calendar.adjust_date(delivery_date)
                elif anomaly == "late":
                    delivery_date = fc.forecast_date + timedelta(days=random.randint(1, 2))
                    if calendar and hasattr(calendar, "adjust_date"):
                        delivery_date = calendar.adjust_date(delivery_date)

            qty = Decimal(str(int(qty)))
            if qty <= 0:
                qty = Decimal("1")

            unit = product.internal_unit or product.base_unit or "pcs"

            # status distribution
            if delivery_date < date.today():
                status = random.choices(["shipped", "completed"], weights=[80, 20], k=1)[0]
            else:
                status = random.choices(
                    ["pending", "allocated", "cancelled", "on_hold"],
                    weights=[50, 30, 5, 15],
                    k=1,
                )[0]

            # Create OrderLine
            ol = OrderLine(
                order_id=order.id,
                supplier_item_id=fc.supplier_item_id,
                delivery_date=delivery_date,
                order_quantity=qty,
                unit=unit,
                delivery_place_id=fc.delivery_place_id,
                order_type=base_order_type,
                status=status,
            )

            # --- Order Group Logic ---
            if not is_forecast_linked:
                # Need specific OrderGroup for this product/date
                og_key = (customer_id, fc.supplier_item_id, order.order_date)
                og_id = order_group_map.get(og_key)

                if not og_id:
                    og = OrderGroup(
                        customer_id=customer_id,
                        supplier_item_id=fc.supplier_item_id,
                        order_date=order.order_date,
                        source_file_name=ocr_filename,  # Consistent filename for the order
                    )
                    db.add(og)
                    db.flush()
                    og_id = og.id
                    order_group_map[og_key] = og_id

                ol.order_group_id = og_id
            else:
                ol.order_group_id = None
            # -------------------------

            db.add(ol)
            db.flush()
            line_count += 1

            # If allocated, create LotReservation
            if status == "allocated":
                lot_id = get_any_lot_id(db, fc.supplier_item_id, qty)
                if lot_id:
                    res = LotReservation(
                        lot_id=lot_id,
                        source_type=ReservationSourceType.ORDER.value,
                        source_id=ol.id,
                        reserved_qty=qty,
                        status=ReservationStatus.ACTIVE.value,
                    )
                    db.add(res)
                else:
                    # Could not find enough stock, revert status to pending
                    ol.status = "pending"

    db.commit()
    print(f"[INFO] Generated {order_count} orders with {line_count} lines (forecast-based)")

    if stockout_enabled and customers and products:
        _generate_stockout_scenarios(db, customers, products, delivery_places)


def _generate_stockout_scenarios(
    db: Session,
    customers: list[Customer],
    products: list[SupplierItem],
    delivery_places: list[DeliveryPlace],
):
    """Generate specific stockout scenarios."""
    print("[INFO] Generating Stockout Scenarios...")
    today = date.today()

    for _key, scenario in STOCKOUT_SCENARIOS.items():
        # Pick a random product/customer
        product = random.choice(products)
        customer = random.choice(customers)
        dp = next((dp for dp in delivery_places if dp.customer_id == customer.id), None)

        # Create Order (Past/Recent)
        order = Order(
            customer_id=customer.id,
            order_date=today - timedelta(days=random.randint(1, 5)),
            notes=f"Scenario: {scenario['description']}",
        )
        db.add(order)
        db.flush()

        # Quantity from scenario
        qty = Decimal(str(scenario.get("order_qty", 100)))

        # Simulating scenario behaviors (Unfulfilled, etc.)
        # Ideally we force the inventory state, but that's hard.
        # Instead we CREATE the order with the expected outcome state.

        scenario_id = scenario["scenario_id"]
        status = "pending"

        if scenario_id == "stockout_partial":
            # Just create a pending order. The system (if logic runs) would partial allocate.
            # Here we just leave it pending to signify shortage.
            pass
        elif scenario_id == "stockout_complete":
            pass
        elif scenario_id == "stockout_backorder":
            pass

        ol = OrderLine(
            order_id=order.id,
            supplier_item_id=product.id,
            delivery_date=today,  # Due today or past
            order_quantity=qty,
            unit="pcs",
            delivery_place_id=dp.id if dp else None,
            order_type="ORDER_MANUAL",
            status=status,
        )
        db.add(ol)

    db.commit()
