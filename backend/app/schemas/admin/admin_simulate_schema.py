# backend/app/schemas/admin_simulate_schema.py
"""Schema definitions for seed simulation API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, conint, field_validator


class SimulateSeedRequest(BaseModel):
    """テストデータシミュレーションリクエスト."""

    profile: str | None = Field(
        default=None,
        description="プロファイル名（small/medium/large_near、Noneの場合はデフォルト）",
    )
    random_seed: int | None = Field(
        default=None,
        description="乱数シード（Noneの場合は現在時刻を使用）",
    )
    warehouses: conint(ge=1, le=10) = Field(  # type: ignore
        default=2,
        description="倉庫数（1〜10、既定=2）",
    )
    customers: conint(ge=0) | None = Field(
        default=3,
        description="顧客数（0以上、Noneの場合はプロファイル既定）",
    )
    suppliers: conint(ge=0) | None = Field(
        default=2,
        description="仕入先数（0以上、Noneの場合はプロファイル既定）",
    )
    products: conint(ge=0) | None = Field(
        default=5,
        description="製品数（0以上、Noneの場合はプロファイル既定）",
    )
    lots: conint(ge=0) | None = Field(
        default=10,
        description="ロット数（0以上、Noneの場合はプロファイル既定）",
    )
    orders: conint(ge=0) | None = Field(
        default=5,
        description="受注数（0以上、Noneの場合はプロファイル既定）",
    )
    lot_split_max_per_line: conint(ge=1, le=3) = Field(  # type: ignore
        default=1,
        description="1明細あたりロット分割上限（1〜3、既定=1）",
    )
    order_line_items_per_order: conint(ge=1, le=5) = Field(  # type: ignore
        default=1,
        description="受注明細行の上限（1〜5、既定=1）",
    )
    destinations_max_per_order: int = Field(
        default=5,
        description="受注の納品先上限（常に5固定）",
    )
    forecasts: conint(ge=0, le=1) | None = Field(  # type: ignore
        default=1,
        description="需要予測データ生成（0=無効, 1=有効, Noneはプロファイル既定）",
    )
    save_snapshot: bool = Field(
        default=True,
        description="スナップショットを保存するか",
    )
    snapshot_name: str | None = Field(
        default=None,
        description="スナップショット名（自動生成の場合はNone）",
    )
    use_last_snapshot: bool = Field(
        default=False,
        description="最後のスナップショットを使用するか",
    )
    case_mix: dict[str, float] | None = Field(
        default=None,
        description="ケースミックス比率（API上書き用、合計<=1.0）",
    )

    @field_validator("destinations_max_per_order")
    @classmethod
    def validate_destinations_max(cls, v: int) -> int:
        """納品先上限は5固定."""
        if v != 5:
            raise ValueError("destinations_max_per_order must be 5 (fixed)")
        return v

    @field_validator("case_mix")
    @classmethod
    def validate_case_mix(cls, v: dict[str, float] | None) -> dict[str, float] | None:
        """ケースミックスの合計は1.0以下."""
        if v is not None:
            total = sum(v.values())
            if total > 1.0:
                raise ValueError(f"case_mix total ({total}) must not exceed 1.0")
        return v


class SimulateSeedResponse(BaseModel):
    """テストデータシミュレーション開始レスポンス."""

    task_id: str = Field(description="ジョブID")
    message: str = Field(description="メッセージ")


class SimulateProgressResponse(BaseModel):
    """テストデータシミュレーション進捗レスポンス."""

    task_id: str
    status: str
    phase: str
    progress_pct: int
    logs: list[str]
    error: str | None = None


class CapCheckResult(BaseModel):
    """上限チェック結果."""

    lot_split: str = Field(description="ロット分割チェック（OK/NG）")
    destinations: str = Field(description="納品先数チェック（OK/NG）")
    order_lines: str = Field(description="受注明細行チェック（OK/NG）")


class SimulateResultSummary(BaseModel):
    """テストデータシミュレーション結果サマリ."""

    warehouses: int
    forecasts: int = Field(default=0, description="需要予測データ件数")
    orders: int
    order_lines: int
    lots: int
    allocations: int
    cap_checks: CapCheckResult
    stock_equation_ok: bool
    orphan_count: int = Field(default=0, description="孤児レコード数")


class SimulateResultResponse(BaseModel):
    """テストデータシミュレーション結果レスポンス."""

    success: bool
    summary: SimulateResultSummary | None = None
    snapshot_id: int | None = None
    error: str | None = None


class SeedSnapshotListItem(BaseModel):
    """スナップショットリストアイテム."""

    id: int
    name: str
    created_at: datetime
    params_json: dict
    summary_json: dict | None = None


class SeedSnapshotListResponse(BaseModel):
    """スナップショット一覧レスポンス."""

    snapshots: list[SeedSnapshotListItem]


class SeedSnapshotCreateRequest(BaseModel):
    """スナップショット作成リクエスト."""

    name: str = Field(description="スナップショット名")
    params_json: dict = Field(description="パラメータJSON")
    profile_json: dict | None = Field(default=None, description="プロファイルJSON")
    summary_json: dict | None = Field(default=None, description="サマリJSON")


class SeedSnapshotCreateResponse(BaseModel):
    """スナップショット作成レスポンス."""

    id: int
    name: str
    created_at: datetime


class SeedSnapshotRestoreResponse(BaseModel):
    """スナップショット復元レスポンス."""

    task_id: str
    message: str
