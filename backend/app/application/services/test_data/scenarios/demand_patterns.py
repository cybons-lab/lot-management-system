DEMAND_PATTERN_SCENARIOS = {
    # === 基本パターン ===
    "steady_demand": {
        "scenario_id": "demand_steady",
        "description": "定常需要（変動なし）",
        "daily_demand": 100,
        "variance": 0.05,
        "duration_days": 90,
    },
    "growing_demand": {
        "scenario_id": "demand_growing",
        "description": "成長トレンド（月5%増）",
        "daily_demand": 100,
        "trend": 0.05,
        "duration_days": 180,
    },
    "declining_demand": {
        "scenario_id": "demand_declining",
        "description": "減少トレンド（月3%減）",
        "daily_demand": 100,
        "trend": -0.03,
        "duration_days": 180,
    },
    # === 季節パターン ===
    "seasonal_summer_peak": {
        "scenario_id": "demand_seasonal_summer",
        "description": "夏季繁忙（6-8月150%）",
        "base_demand": 100,
        "peak_months": [6, 7, 8],
        "peak_factor": 1.5,
    },
    "seasonal_winter_peak": {
        "scenario_id": "demand_seasonal_winter",
        "description": "冬季繁忙（11-1月150%）",
        "base_demand": 100,
        "peak_months": [11, 12, 1],
        "peak_factor": 1.5,
    },
    # === 週次パターン ===
    "weekly_pattern": {
        "scenario_id": "demand_weekly",
        "description": "週次パターン（月曜多、週末少）",
        "base_demand": 100,
        "day_factors": {0: 1.3, 1: 1.1, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.4, 6: 0.3},
    },
    # === 異常パターン ===
    "spike_demand": {
        "scenario_id": "demand_spike",
        "description": "スパイク（特定日に急増）",
        "base_demand": 100,
        "spike_days": [15, 45, 75],  # 15日ごとにスパイク
        "spike_factor": 3.0,
    },
    "irregular_demand": {
        "scenario_id": "demand_irregular",
        "description": "不規則需要（ランダム変動大）",
        "base_demand": 100,
        "variance": 0.40,
    },
}
