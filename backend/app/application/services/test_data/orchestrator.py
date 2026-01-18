import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.application.services.test_data_generator import generate_all_test_data


logger = logging.getLogger(__name__)


@dataclass
class GenerateOptions:
    """Test Data Generation Options."""

    preset_id: str = "quick"
    scale: str = "small"  # small, medium, large
    mode: str = "strict"  # strict, relaxed, invalid_only
    include_demand_patterns: bool = False
    include_stockout_scenarios: bool = False
    include_lt_variance: bool = False
    base_date: str | None = None  # YYYY-MM-DD
    history_months: int = 6  # Default history length


@dataclass
class Preset:
    id: str
    description: str
    options: GenerateOptions


PRESETS = {
    "quick": Preset(
        id="quick",
        description="開発中の素早い確認 (Small, Strict, 3-month history)",
        options=GenerateOptions(scale="small", mode="strict", history_months=3),
    ),
    "full_coverage": Preset(
        id="full_coverage",
        description="網羅的テスト (Medium, Strict, 12-month history, LT variance)",
        options=GenerateOptions(
            scale="medium", mode="strict", history_months=12, include_lt_variance=True
        ),
    ),
    "stress_test": Preset(
        id="stress_test",
        description="負荷検証 (Large, Strict, 36-month history)",
        options=GenerateOptions(
            scale="large",
            mode="strict",
            history_months=36,
            include_demand_patterns=True,
            include_stockout_scenarios=True,
            include_lt_variance=True,
        ),
    ),
    "warning_focus": Preset(
        id="warning_focus",
        description="警告検証 (Medium, Relaxed)",
        options=GenerateOptions(scale="medium", mode="relaxed"),
    ),
    "invalid_only": Preset(
        id="invalid_only",
        description="破壊データテスト (Small, Invalid Only) ※専用DB必須",
        options=GenerateOptions(scale="small", mode="invalid_only"),
    ),
    "replenishment_test": Preset(
        id="replenishment_test",
        description="発注検証 (Medium, Strict, 24-month history, LT variance)",
        options=GenerateOptions(
            scale="medium",
            mode="strict",
            history_months=24,
            include_demand_patterns=True,
            include_stockout_scenarios=True,
            include_lt_variance=True,
        ),
    ),
    "forecast_test": Preset(
        id="forecast_test",
        description="予測検証 (Medium, Strict, 12-month history)",
        options=GenerateOptions(
            scale="medium", mode="strict", history_months=12, include_demand_patterns=True
        ),
    ),
}


class TestDataOrchestrator:
    """Test Data Orchestrator."""

    def get_presets(self) -> list[dict]:
        return [
            {"id": p.id, "description": p.description, "options": p.options.__dict__}
            for p in PRESETS.values()
        ]

    def generate(self, db: Session, options_dict: dict):
        """Execute generation."""
        # 1. オプション解析
        preset_id = options_dict.get("preset_id", "quick")
        preset = PRESETS.get(preset_id)
        if not preset:
            raise ValueError(f"Unknown preset_id: {preset_id}")

        # プリセットをベースに、指定があれば上書き
        base_options = preset.options
        # Note: Dataclass replace or simple dict update.
        # Here we just use the preset options for simplicity as per plan "Preset definition"
        # If we want to allow override:
        # options = replace(base_options, **overrides)
        options = base_options

        # 2. 安全性チェック (invalid_only)
        if options.mode == "invalid_only":
            self._check_safety(db)

        # 3. 生成実行 (generatorへ委譲)
        # generate_all_test_data を拡張して options を渡せるようにする必要がある
        # または、Global Context にセットするか (あまり良くない)
        # ここでは generate_all_test_data のシグネチャを変えて渡す
        logger.info(f"Starting test data generation with options: {options}")
        generate_all_test_data(db, options=options)
        logger.info("Test data generation completed.")

    def _check_safety(self, db: Session):
        """Safety check for destructive changes."""
        # DB名に 'test' が含まれているか確認するためのロジック
        # ※実際の接続文字列取得はドライバ依存だが、簡易チェック
        # engine.url.database
        bind = db.get_bind()
        db_name = str(bind.url.database) if bind and hasattr(bind, "url") else None
        if not db_name or "test" not in db_name.lower():
            raise RuntimeError(
                f"Safety Check Failed: Mode 'invalid_only' is NOT allowed on database '{db_name}'. "
                "It requires a database name containing 'test'."
            )
