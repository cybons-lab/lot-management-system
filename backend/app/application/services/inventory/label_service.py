from decimal import Decimal
from io import BytesIO

from reportlab.lib import units
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.presentation.schemas.inventory.inventory_schema import LotResponse


class LabelService:
    """Service for generating labels."""

    def __init__(self, db: Session):
        self.db = db
        self.lot_service = LotService(db)

    def generate_label_pdf(self, lot_ids: list[int]) -> BytesIO:
        """Generates a PDF byte stream containing labels for the provided lot IDs.

        Uses a standard address label layout (e.g., 2 cols x 5 rows on A4) or a thermal printer layout.
        For Phase 3 MVP, we will assume a simple A4 sheet logic for easier testing without specialized hardware,
        or a continuous roll logic if requested.

        Let's implement a thermal printer friendly size (e.g., 80mm x 50mm) as single pages.
        """
        buffer = BytesIO()

        # Thermal printer label size: 80mm x 50mm
        page_width = 80 * units.mm
        page_height = 50 * units.mm
        c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

        # Fetch lots
        # We need a way to fetch multiple lots by ID. LotService might not have a batch fetch,
        # so we iterate for now or query directly if performance is an issue.
        # Ideally, we should add `get_lots_by_ids` to LotService.
        # For MVP, we iterate.
        # Rename list and variables to avoid type inference confusion
        label_lots: list[LotResponse] = []
        for lot_id in lot_ids:
            lot_entity = self.lot_service.get_lot(lot_id)
            if lot_entity:
                # Map Lot entity to LotResponse
                lot_res = LotResponse(
                    id=lot_entity.id,
                    lot_number=lot_entity.lot_number or "",
                    product_group_id=lot_entity.product_group_id,
                    product_code=lot_entity.product_group.maker_part_no
                    if lot_entity.product_group
                    else "",
                    product_name=lot_entity.product_group.display_name
                    if lot_entity.product_group
                    else "Unknown",
                    supplier_id=lot_entity.supplier_id,
                    supplier_code=lot_entity.supplier.supplier_code
                    if lot_entity.supplier
                    else None,
                    supplier_name=lot_entity.supplier.supplier_name if lot_entity.supplier else "",
                    warehouse_id=lot_entity.warehouse_id,
                    warehouse_code=lot_entity.warehouse.warehouse_code
                    if lot_entity.warehouse
                    else "",
                    warehouse_name=lot_entity.warehouse.warehouse_name
                    if lot_entity.warehouse
                    else "",
                    current_quantity=lot_entity.current_quantity,
                    allocated_quantity=Decimal(0),
                    unit=lot_entity.unit,
                    received_date=lot_entity.received_date,
                    expiry_date=lot_entity.expiry_date,
                    status=lot_entity.status,  # type: ignore
                    created_at=lot_entity.created_at,
                    updated_at=lot_entity.updated_at,
                    last_updated=lot_entity.updated_at,
                    is_primary_supplier=False,
                )
                label_lots.append(lot_res)

        for label_lot in label_lots:
            self._draw_label(c, label_lot, page_width, page_height)
            c.showPage()

        c.save()
        buffer.seek(0)
        return buffer

    def _draw_label(self, c: canvas.Canvas, lot: LotResponse, width: float, height: float):
        """Draws a single label content on the current canvas page."""
        # Margin
        margin = 5 * units.mm

        # Border (optional, for visual debugging)
        # c.rect(1, 1, width-2, height-2)

        # Title: Product Name
        c.setFont("Helvetica-Bold", 10)
        product_name = lot.product_name or "Unknown Product"
        # Simple truncation if too long
        if len(product_name) > 30:
            product_name = product_name[:27] + "..."
        c.drawString(margin, height - margin - 10, product_name)

        # Content
        c.setFont("Helvetica", 8)
        y_cursor = height - margin - 22
        line_height = 10

        c.drawString(margin, y_cursor, f"Code: {lot.product_code or '-'}")
        y_cursor -= line_height

        c.drawString(margin, y_cursor, f"Lot No: {lot.lot_number}")
        y_cursor -= line_height

        expiry = lot.expiry_date.strftime("%Y/%m/%d") if lot.expiry_date else "-"
        c.drawString(margin, y_cursor, f"Expiry: {expiry}")
        y_cursor -= line_height

        qty = f"{lot.current_quantity} {lot.unit}"
        c.drawString(margin, y_cursor, f"Qty: {qty}")

        # Barcode (Stub - ReportLab has barcode support but requires extensions or extra import)
        # For MVP, we skip complex barcode generation unless requested.
        pass
