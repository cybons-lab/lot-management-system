from io import BytesIO

from openpyxl import Workbook

from app.application.services.master_import.file_handlers import parse_excel


def _build_excel(headers: list[str], rows: list[list[object]], sheet_title: str = "Template") -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    stream = BytesIO()
    workbook.save(stream)
    return stream.getvalue()


def test_parse_excel_handles_supplier_template_sheet() -> None:
    content = _build_excel(
        ["supplier_code", "supplier_name"],
        [["SUP-001", "仕入先A"]],
    )

    parsed = parse_excel(content)

    assert parsed["supply_data"]["suppliers"] == [
        {"supplier_code": "SUP-001", "supplier_name": "仕入先A", "products": []}
    ]


def test_parse_excel_handles_delivery_place_template_sheet() -> None:
    content = _build_excel(
        [
            "customer_code",
            "customer_name",
            "delivery_place_code",
            "delivery_place_name",
            "jiku_code",
        ],
        [["CUST-001", "得意先A", "DP-001", "納入先A", "J-001"]],
    )

    parsed = parse_excel(content)

    assert parsed["customer_data"]["customers"] == [
        {
            "customer_code": "CUST-001",
            "customer_name": "得意先A",
            "delivery_places": [
                {
                    "delivery_place_code": "DP-001",
                    "delivery_place_name": "納入先A",
                    "jiku_code": "J-001",
                }
            ],
            "items": [],
        }
    ]
