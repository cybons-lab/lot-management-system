LT_SCENARIOS = {
    "lt_on_time": {
        "scenario_id": "lt_on_time",
        "description": "計画通りの入荷",
        "planned_lt_days": 14,
        "actual_lt_days": 14,
        "variance": 0,
    },
    "lt_early": {
        "scenario_id": "lt_early",
        "description": "早着（計画より3日早い）",
        "planned_lt_days": 14,
        "actual_lt_days": 11,
        "variance": -3,
    },
    "lt_delayed_minor": {
        "scenario_id": "lt_delayed_minor",
        "description": "軽微遅延（1-3日）",
        "planned_lt_days": 14,
        "actual_lt_days": 16,
        "variance": 2,
    },
    "lt_delayed_major": {
        "scenario_id": "lt_delayed_major",
        "description": "大幅遅延（1週間以上）",
        "planned_lt_days": 14,
        "actual_lt_days": 25,
        "variance": 11,
    },
    "lt_variable": {
        "scenario_id": "lt_variable",
        "description": "ばらつき大（標準偏差5日）",
        "planned_lt_days": 14,
        "actual_lt_distribution": {"mean": 14, "std": 5},
    },
}
