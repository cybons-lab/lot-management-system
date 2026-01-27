from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal


@dataclass
class ReplenishmentRecommendation:
    """発注提案。."""

    id: str  # 提案ID
    product_group_id: int
    warehouse_id: int
    supplier_id: int

    # === 提案内容 ===
    recommended_order_qty: Decimal  # 推奨発注量
    recommended_order_date: date  # 推奨発注日
    expected_arrival_date: date  # 想定入荷日

    # === 計算根拠 ===
    reorder_point: Decimal  # 発注点（ROP）
    safety_stock: Decimal  # 安全在庫
    target_stock: Decimal  # 目標在庫

    # === 現在状況 ===
    current_on_hand: Decimal  # 現在手持在庫
    current_reserved: Decimal  # 予約済み
    current_available: Decimal  # 利用可能在庫
    pending_inbound: Decimal  # 入荷予定

    # === 需要予測 ===
    avg_daily_demand: Decimal  # 平均日次需要
    demand_forecast_horizon: int  # 予測期間（日）
    demand_forecast_total: Decimal  # 予測期間の需要合計

    # === リードタイム ===
    lead_time_days: int  # リードタイム（日）
    lead_time_std: float  # LT標準偏差

    # === 制約適用 ===
    moq: Decimal | None = None  # 最小発注数量
    lot_size: Decimal | None = None  # ロットサイズ
    constraints_applied: list[str] = field(default_factory=list)  # 適用された制約

    # === メタ情報 ===
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "draft"  # draft / approved / rejected
    explanation: str = ""  # 説明文
