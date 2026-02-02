STOCKOUT_SCENARIOS = {
    "partial_fulfillment": {
        "scenario_id": "stockout_partial",
        "description": "部分充足（在庫不足で一部のみ出荷）",
        "order_qty": 100,
        "available_qty": 60,
        "fulfilled_qty": 60,
        "unfulfilled_qty": 40,
        "edge_case_id": "partial_allocation",
    },
    "complete_stockout": {
        "scenario_id": "stockout_complete",
        "description": "完全欠品（在庫ゼロで出荷不可）",
        "order_qty": 100,
        "available_qty": 0,
        "fulfilled_qty": 0,
        "unfulfilled_qty": 100,
        "edge_case_id": "no_allocation",
    },
    "backorder_created": {
        "scenario_id": "stockout_backorder",
        "description": "バックオーダー発生（入荷待ち）",
        "order_qty": 100,
        "available_qty": 0,
        "inbound_qty": 150,
        "expected_fulfillment_date_offset": 14,  # base_date + 14
    },
}
