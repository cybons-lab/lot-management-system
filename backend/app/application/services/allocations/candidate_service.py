"""Allocation Candidate Service - SSOT for allocation candidate extraction.

This service is the single source of truth for fetching allocation candidates.
All allocation-related candidate queries should go through this service.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.domain.allocation_policy import AllocationPolicy, LockMode
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.repositories.lot_repository import LotRepository


if TYPE_CHECKING:
    pass


logger = logging.getLogger(__name__)


class AllocationCandidateService:
    """SSOT entry point for allocation candidate extraction.

    This service provides a unified interface for fetching allocation candidates
    across all use cases (preview, auto-allocation, manual allocation, etc.).

    【設計意図】なぜSSOT（Single Source of Truth）パターンを採用するのか:

    1. ロジックの一元管理
       理由: 引当候補の選定ルールは複雑（有効期限、ロック状態、サンプル品除外等）
       → 複数箇所で同じロジックを実装すると、修正漏れやバグの温床になる
       → 1箇所に集約することで、ルール変更時の影響範囲を最小化

    2. ポリシー（FEFO/FIFO）の強制
       理由: policyパラメータをデフォルト値なしの必須項目とすることで、
       呼び出し側が「どのポリシーで引当するか」を明示的に決定する
       → 暗黙的なデフォルト動作によるバグを防ぐ
       例: 「なぜこの製品はFIFOで引当されたのか？」という質問に明確に答えられる

    3. ロックモードの柔軟な制御
       理由: 用途によってロック戦略を変える必要がある
       - プレビュー: NONE（読み取り専用、ロック不要）
       - 本番引当: FOR_UPDATE_SKIP_LOCKED（競合回避、待機なし）
       - バッチ処理: FOR_UPDATE（確実にロック、待機あり）
       → デフォルトはNONE（最も安全、他処理をブロックしない）

    4. テスタビリティの向上
       理由: 引当ロジックをモック化しやすい
       → サービス層をモック化すれば、リポジトリやDBへの依存なしでテスト可能

    Usage:
        service = AllocationCandidateService(db)
        candidates = service.get_candidates(
            supplier_item_id=123,
            policy=AllocationPolicy.FEFO,
            lock_mode=LockMode.NONE,
        )
    """

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self._repo = LotRepository(db)

    def get_candidates(
        self,
        supplier_item_id: int,
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode = LockMode.NONE,
        warehouse_id: int | None = None,
        exclude_expired: bool = True,
        safety_days: int = 0,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> list[LotCandidate]:
        """Fetch allocation candidates with explicit policy and locking.

        【設計意図】各パラメータのデフォルト値の根拠:

        1. exclude_expired=True（デフォルト: 有効期限切れを除外）
           理由: 期限切れ品を誤って引き当てると、顧客クレームや品質問題に直結
           → 安全側に倒す設計（意図的に期限切れ品を使う場合のみFalseを指定）

        2. safety_days=0（デフォルト: 安全マージンなし）
           理由: 製品によって必要な安全マージンが異なる
           例: ゴム部品は30日、金属部品は不要
           → 呼び出し側が製品特性に応じて設定すべき

        3. exclude_locked=True（デフォルト: ロック済み在庫を除外）
           理由: ロック状態 = 品質検査中 or 顧客専用在庫
           → 通常の引当では使用不可、特別な理由がない限り除外

        4. include_sample=False, include_adhoc=False
           理由: サンプル品・臨時品は通常の出荷に使わない
           → デフォルトで除外し、必要な場合のみ明示的にTrue

        5. min_available_qty=0.0（デフォルト: 数量制限なし）
           理由: 小数点以下の端数でも引当可能にする
           → ただし、呼び出し側で「最低10個以上のロットのみ」等の条件付けも可能

        これらのデフォルト値は「安全な引当」を優先した設計。
        特殊なケースでは明示的にフラグを変更することで柔軟に対応。

        Args:
            supplier_item_id: Product ID to filter by
            policy: Sorting policy (FEFO or FIFO) - REQUIRED
            lock_mode: Database locking mode (default: NONE)
            warehouse_id: Optional warehouse filter
            exclude_expired: Exclude lots past expiry date (default: True)
            safety_days: Safety margin in days before expiry (default: 0)
            exclude_locked: Exclude lots with locked_quantity > 0 (default: True)
            include_sample: Include sample origin lots (default: False)
            include_adhoc: Include adhoc origin lots (default: False)
            min_available_qty: Minimum available quantity threshold (default: 0.0)

        Returns:
            List of LotCandidate sorted by policy
        """
        logger.debug(
            "Finding allocation candidates",
            extra={
                "supplier_item_id": supplier_item_id,
                "policy": policy.value if hasattr(policy, "value") else str(policy),
                "lock_mode": lock_mode.value if hasattr(lock_mode, "value") else str(lock_mode),
                "warehouse_id": warehouse_id,
                "exclude_expired": exclude_expired,
                "safety_days": safety_days,
                "exclude_locked": exclude_locked,
                "include_sample": include_sample,
                "include_adhoc": include_adhoc,
                "min_available_qty": min_available_qty,
            },
        )

        candidates = self._repo.find_allocation_candidates(
            supplier_item_id=supplier_item_id,
            policy=policy,
            lock_mode=lock_mode,
            warehouse_id=warehouse_id,
            exclude_expired=exclude_expired,
            safety_days=safety_days,
            exclude_locked=exclude_locked,
            include_sample=include_sample,
            include_adhoc=include_adhoc,
            min_available_qty=min_available_qty,
        )

        logger.info(
            "Allocation candidates found",
            extra={
                "supplier_item_id": supplier_item_id,
                "policy": policy.value if hasattr(policy, "value") else str(policy),
                "candidate_count": len(candidates),
                "total_available_qty": sum(c.available_qty for c in candidates),
                "warehouse_id": warehouse_id,
            },
        )

        if not candidates:
            logger.warning(
                "No allocation candidates found - check filters",
                extra={
                    "supplier_item_id": supplier_item_id,
                    "policy": policy.value if hasattr(policy, "value") else str(policy),
                    "warehouse_id": warehouse_id,
                    "exclude_expired": exclude_expired,
                    "exclude_locked": exclude_locked,
                    "min_available_qty": min_available_qty,
                },
            )

        return candidates

    def get_candidates_for_products(
        self,
        supplier_item_ids: list[int],
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode = LockMode.NONE,
        exclude_expired: bool = True,
        safety_days: int = 0,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> dict[int, list[LotCandidate]]:
        """Fetch allocation candidates for multiple products.

        Convenience method for batch operations.

        Args:
            supplier_item_ids: List of product IDs to fetch candidates for
            policy: Sorting policy (FEFO or FIFO) - REQUIRED
            lock_mode: Database locking mode (default: NONE)
            exclude_expired: Exclude lots past expiry date (default: True)
            safety_days: Safety margin in days before expiry (default: 0)
            exclude_locked: Exclude lots with locked_quantity > 0 (default: True)
            include_sample: Include sample origin lots (default: False)
            include_adhoc: Include adhoc origin lots (default: False)
            min_available_qty: Minimum available quantity threshold (default: 0.0)

        Returns:
            Dict mapping supplier_item_id to list of LotCandidate
        """
        result: dict[int, list[LotCandidate]] = {}
        for supplier_item_id in supplier_item_ids:
            candidates = self.get_candidates(
                supplier_item_id=supplier_item_id,
                policy=policy,
                lock_mode=lock_mode,
                exclude_expired=exclude_expired,
                safety_days=safety_days,
                exclude_locked=exclude_locked,
                include_sample=include_sample,
                include_adhoc=include_adhoc,
                min_available_qty=min_available_qty,
            )
            if candidates:
                result[supplier_item_id] = candidates
        return result
