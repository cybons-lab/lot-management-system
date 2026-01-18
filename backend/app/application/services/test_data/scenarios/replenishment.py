REPLENISHMENT_TEST_SCENARIOS = {
    "rop_trigger": {
        "scenario_id": "repl_rop_trigger",
        "description": "発注点到達で発注提案が生成される",
        "on_hand": 50,
        "rop": 100,
        "expected": "recommendation_generated",
    },
    "rop_not_trigger": {
        "scenario_id": "repl_rop_not_trigger",
        "description": "発注点未到達で発注提案なし",
        "on_hand": 150,
        "rop": 100,
        "expected": "no_recommendation",
    },
    "moq_applied": {
        "scenario_id": "repl_moq_applied",
        "description": "MOQ制約が適用される",
        "calculated_qty": 80,
        "moq": 100,
        "expected_qty": 100,
    },
    "lot_rounding": {
        "scenario_id": "repl_lot_rounding",
        "description": "ロット丸めが適用される",
        "calculated_qty": 85,
        "lot_size": 50,
        "expected_qty": 100,  # 50の倍数に切り上げ
    },
    "seasonal_safety_stock": {
        "scenario_id": "repl_seasonal_safety",
        "description": "繁忙期前の安全在庫増加",
        "current_month": 5,  # 6月繁忙期の前月
        "peak_months": [6, 7, 8],
        "safety_stock_multiplier": 1.5,
    },
}
