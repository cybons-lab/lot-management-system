"""Export service for converting data to file formats."""

import io
from typing import Any

from fastapi.responses import StreamingResponse


class ExportService:
    """Service for exporting data to various formats."""

    @staticmethod
    def _prepare_data(data: list[dict[str, Any] | Any]) -> list[dict[str, Any]]:
        """Convert Pydantic models to dicts if necessary."""
        if not data:
            return []

        # If first item has model_dump, assume all are Pydantic models
        if hasattr(data[0], "model_dump"):
            return [item.model_dump() for item in data]

        # If first item has dict, assume all are SQLAlchemy models or similar
        if hasattr(data[0], "_asdict"):
            return [item._asdict() for item in data]

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
