"""Export service for converting data to file formats."""

import io
from typing import Any

from fastapi.responses import StreamingResponse


# Template definitions for CSV import
TEMPLATE_DEFINITIONS = {
    "products": {
        "columns": [
            "product_code",
            "product_name",
            "internal_unit",
            "external_unit",
            "qty_per_internal_unit",
        ],
        "sample_row": ["PROD-001", "サンプル製品", "個", "箱", "10"],
        "description": "製品マスタ インポート用テンプレート",
    },
    "customers": {
        "columns": ["customer_code", "customer_name", "address", "contact_name", "phone", "email"],
        "sample_row": [
            "CUST-001",
            "サンプル顧客",
            "東京都千代田区",
            "担当者名",
            "03-1234-5678",
            "sample@example.com",
        ],
        "description": "顧客マスタ インポート用テンプレート",
    },
    "warehouses": {
        "columns": ["warehouse_code", "warehouse_name", "warehouse_type"],
        "sample_row": ["WH-001", "サンプル倉庫", "internal"],
        "description": "倉庫マスタ インポート用テンプレート（warehouse_type: internal/external/supplier）",
    },
    "suppliers": {
        "columns": ["supplier_code", "supplier_name"],
        "sample_row": ["SUP-001", "サンプル仕入先"],
        "description": "仕入先マスタ インポート用テンプレート",
    },
    "delivery_places": {
        "columns": [
            "customer_code",
            "customer_name",
            "delivery_place_code",
            "delivery_place_name",
            "jiku_code",
        ],
        "sample_row": [
            "CUST-001",
            "サンプル顧客",
            "DP-001",
            "サンプル納入先",
            "J-001",
        ],
        "description": "納入先マスタ インポート用テンプレート",
    },
}


class ExportService:
    """Service for exporting data to various formats."""

    @staticmethod
    def _prepare_data(data: list[dict[str, Any] | Any]) -> list[dict[str, Any]]:
        """Convert Pydantic models to dicts if necessary."""
        if not data:
            return []

        # If first item has model_dump, assume all are Pydantic models
        if hasattr(data[0], "model_dump"):
            return [item.model_dump() for item in data]  # type: ignore[union-attr]

        # If first item has dict, assume all are SQLAlchemy models or similar
        if hasattr(data[0], "_asdict"):
            return [item._asdict() for item in data]  # type: ignore[union-attr]

        return data

    @staticmethod
    def export_to_csv(data: list[Any], filename: str = "export") -> StreamingResponse:
        """Export data to CSV."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for export. Please install it.")

        processed_data = ExportService._prepare_data(data)
        df = pd.DataFrame(processed_data)

        stream = io.StringIO()
        df.to_csv(stream, index=False, encoding="utf-8-sig")

        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}.csv"
        return response

    @staticmethod
    def export_to_excel(data: list[Any], filename: str = "export") -> StreamingResponse:
        """Export data to Excel (xlsx)."""
        try:
            import openpyxl  # noqa: F401
            import pandas as pd
        except ImportError:
            raise ImportError("pandas and openpyxl are required for export. Please install them.")

        processed_data = ExportService._prepare_data(data)
        df = pd.DataFrame(processed_data)

        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Sheet1")

        stream.seek(0)

        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}.xlsx"
        return response

    @staticmethod
    def export_template(
        template_type: str,
        format: str = "csv",
        include_sample: bool = True,
    ) -> StreamingResponse:
        """Export an import template with headers (and optional sample data).

        Args:
            template_type: One of 'products', 'customers', 'warehouses', 'suppliers', 'delivery_places'
            format: 'csv' or 'xlsx'
            include_sample: Whether to include a sample row

        Returns:
            StreamingResponse with the template file
        """
        if template_type not in TEMPLATE_DEFINITIONS:
            raise ValueError(f"Unknown template type: {template_type}")

        template = TEMPLATE_DEFINITIONS[template_type]
        columns = list(template["columns"])
        data: list[list[str]] = [columns]

        if include_sample:
            data.append(list(template["sample_row"]))

        filename = f"{template_type}_template"

        if format == "xlsx":
            return ExportService._export_template_excel(data, filename)
        return ExportService._export_template_csv(data, filename)

    @staticmethod
    def _export_template_csv(data: list[list[str]], filename: str) -> StreamingResponse:
        """Export template data as CSV."""
        stream = io.StringIO()
        for row in data:
            stream.write(",".join(str(cell) for cell in row) + "\n")

        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}.csv"
        return response

    @staticmethod
    def _export_template_excel(data: list[list[str]], filename: str) -> StreamingResponse:
        """Export template data as Excel."""
        try:
            from openpyxl import Workbook
        except ImportError:
            raise ImportError("openpyxl is required for Excel export. Please install it.")

        wb = Workbook()
        ws = wb.active
        assert ws is not None, "Workbook should have an active worksheet"
        ws.title = "Template"

        for row_idx, row_data in enumerate(data, 1):
            for col_idx, cell_value in enumerate(row_data, 1):
                ws.cell(row=row_idx, column=col_idx, value=cell_value)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}.xlsx"
        return response
