from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta
from typing import TYPE_CHECKING, cast

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models import (
    Lot,
    Product,
    Supplier,
    Warehouse,
)


if TYPE_CHECKING:
    from app.domain.allocation_policy import AllocationPolicy, LockMode
    from app.domain.lot import LotCandidate


class LotRepository:
    """Data-access helpers for lot entities."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, lot_id: int) -> Lot | None:
        """Return a lot by its primary key."""
        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .options(joinedload(Lot.product), joinedload(Lot.warehouse))
            .where(Lot.id == lot_id)
        )
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())

    def find_available_lots(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        min_quantity: float = 0.0,
        excluded_origin_types: list[str] | None = None,
    ) -> Sequence[Lot]:
        """Fetch lots that have stock remaining for a product.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        v2.3: Supports origin_type filtering.

        【設計意図】なぜ利用可能数量の判定をPython側で行うのか:

        理由: 利用可能数量は動的計算が必要
        計算式: current_quantity - sum(lot_reservations where status in ('active', 'confirmed'))
        → SQLだけでは複雑なサブクエリが必要
        → stock_calculation.get_available_quantity()に委譲することで:
          1. ロジックの一元管理（単一責任の原則）
          2. テスト容易性（計算ロジックを独立してテスト可能）
          3. 保守性（計算ルール変更時の影響範囲を限定）

        トレードオフ:
        - パフォーマンス: N+1問題の可能性（ロット数が多いと遅い）
        - メリット: 正確性とロジックの一貫性を優先

        将来の改善案:
        - 大量ロット処理時は、バッチで利用可能数量を計算するSQLビューを作成

        Args:
            product_code: Product code to filter by
            warehouse_code: Optional warehouse code filter
            min_quantity: Minimum available quantity threshold
            excluded_origin_types: List of origin_types to exclude (e.g., ['sample', 'adhoc'])
        """
        product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
        if not product:
            return []

        # First, get all active lots for this product
        stmt: Select[tuple[Lot]] = select(Lot).where(
            Lot.product_id == product.id,
            Lot.status == "active",
        )

        # Filter by origin_type
        if excluded_origin_types:
            stmt = stmt.where(Lot.origin_type.not_in(excluded_origin_types))

        if warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                stmt = stmt.where(Lot.warehouse_id == warehouse.id)
            else:
                return []

        lots = list(self.db.execute(stmt).scalars().all())

        # Filter by available quantity using lot_reservations
        # 【重要】利用可能数量の計算をstock_calculationサービスに委譲
        from app.application.services.inventory.stock_calculation import (
            get_available_quantity,
        )

        available_lots = [
            lot for lot in lots if float(get_available_quantity(self.db, lot)) > min_quantity
        ]
        return available_lots

    def create(
        self,
        supplier_code: str,
        product_code: str,
        lot_number: str,
        warehouse_id: int,
        receipt_date: date | None = None,
        expiry_date: date | None = None,
    ) -> Lot:
        """Create a lot placeholder using known identifiers."""
        warehouse: Warehouse | None = self.db.get(Warehouse, warehouse_id)
        product: Product | None = None
        supplier: Supplier | None = None
        if supplier_code:
            supplier_stmt = select(Supplier).where(Supplier.supplier_code == supplier_code)
            supplier = self.db.execute(supplier_stmt).scalar_one_or_none()
        if product_code:
            product_stmt = select(Product).where(Product.maker_part_code == product_code)
            product = self.db.execute(product_stmt).scalar_one_or_none()

        lot = Lot(
            supplier_id=supplier.id if supplier else None,
            supplier_code=supplier.supplier_code if supplier else supplier_code,
            product_id=product.id if product else None,
            product_code=product.maker_part_code if product else product_code,
            lot_number=lot_number,
            warehouse_id=warehouse_id,
            warehouse_code=warehouse.warehouse_code if warehouse else None,
            received_date=receipt_date or date.today(),
            expiry_date=expiry_date,
        )
        self.db.add(lot)
        return lot

    def find_allocation_candidates(
        self,
        product_id: int,
        *,
        policy: AllocationPolicy,
        lock_mode: LockMode,
        warehouse_id: int | None = None,
        exclude_expired: bool = True,
        safety_days: int = 0,
        exclude_locked: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
        min_available_qty: float = 0.0,
    ) -> list[LotCandidate]:
        """Fetch allocation candidates with explicit policy and locking.

        This is the SSOT implementation for allocation candidate queries.
        All allocation-related candidate fetching should go through this method.

        Args:
            product_id: Product ID to filter by
            policy: Sorting policy (FEFO or FIFO)
            lock_mode: Database locking mode
            warehouse_id: Optional warehouse filter
            exclude_expired: Exclude lots past expiry date
            safety_days: Safety margin in days before expiry (default: 0)
            exclude_locked: Exclude lots with locked_quantity > 0
            include_sample: Include sample origin lots
            include_adhoc: Include adhoc origin lots
            min_available_qty: Minimum available quantity threshold

        Returns:
            List of LotCandidate sorted by policy
        """
        # Build base query using db.query() for session compatibility
        from sqlalchemy import nulls_last

        from app.domain.allocation_policy import AllocationPolicy, LockMode
        from app.domain.lot import LotCandidate

        query = (
            self.db.query(Lot)
            .filter(
                Lot.product_id == product_id,
                Lot.status == "active",
            )
            .options(joinedload(Lot.product), joinedload(Lot.warehouse))
        )

        # Warehouse filter
        if warehouse_id is not None:
            query = query.filter(Lot.warehouse_id == warehouse_id)

        # Origin type filters
        # 【設計】サンプル品・臨時品の除外オプション
        excluded_origins: list[str] = []
        if not include_sample:
            excluded_origins.append("sample")
        if not include_adhoc:
            excluded_origins.append("adhoc")
        if excluded_origins:
            from sqlalchemy import func

            # Use COALESCE to treat NULL as 'normal' which won't be excluded
            # 【設計意図】なぜCOALESCEを使うのか:
            # 理由: origin_typeがNULLのロット = 通常入荷品（デフォルト）
            # → NULLを'normal'として扱うことで、通常入荷品は除外されない
            # → SQLAlchemyのnotin_()はNULLを特殊扱いするため、COALESCE必須
            query = query.filter(func.coalesce(Lot.origin_type, "normal").notin_(excluded_origins))

        # Expiry filter with safety margin
        if exclude_expired:
            from sqlalchemy import or_

            min_expiry_date = date.today() + timedelta(days=safety_days)
            query = query.filter(or_(Lot.expiry_date.is_(None), Lot.expiry_date >= min_expiry_date))

        # Locked filter
        if exclude_locked:
            from sqlalchemy import or_

            query = query.filter(or_(Lot.locked_quantity.is_(None), Lot.locked_quantity == 0))

        # Ordering by policy
        # 【設計意図】ソート順の詳細な根拠:
        #
        # 1. FEFOの場合（有効期限優先）
        #    - nulls_last(Lot.expiry_date.asc()): 有効期限が近いものを優先
        #      なぜnulls_last?: 有効期限なし（NULL）のロットを最後に回す
        #      理由: 有効期限ありのロットを先に消費すべき（FEFO原則）
        #    - Lot.received_date.asc(): 有効期限が同じ場合は入荷日が古い順
        #    - Lot.id.asc(): 最終的なタイブレーカー（決定的なソートを保証）
        #
        # 2. FIFOの場合（入荷日優先）
        #    - Lot.received_date.asc(): 入荷日が古い順
        #    - Lot.id.asc(): タイブレーカー
        #
        # 3. なぜLot.idをタイブレーカーに使うのか:
        #    理由: 同じ入荷日・有効期限のロットが複数存在する可能性
        #    → IDがないと、ソート順が不定（DBによって結果が変わる）
        #    → テストの再現性、デバッグの容易性のため、決定的なソートが必須
        if policy == AllocationPolicy.FEFO:
            query = query.order_by(
                nulls_last(Lot.expiry_date.asc()),  # Expiry date first, NULL last
                Lot.received_date.asc(),  # Then by receipt date
                Lot.id.asc(),  # Final tiebreaker for deterministic sort
            )
        else:  # FIFO
            query = query.order_by(
                Lot.received_date.asc(),  # Receipt date first
                Lot.id.asc(),  # Final tiebreaker
            )

        # Locking
        if lock_mode == LockMode.FOR_UPDATE:
            query = query.with_for_update(of=Lot)
        elif lock_mode == LockMode.FOR_UPDATE_SKIP_LOCKED:
            query = query.with_for_update(skip_locked=True, of=Lot)

        lots = query.all()

        # Filter by available quantity and convert to LotCandidate
        # 【設計意図】なぜSQLではなくPython側で利用可能数量をフィルタするのか:
        #
        # 理由:
        # 1. 利用可能数量は動的計算（lot_reservationsテーブルから集計）
        #    → SQLでサブクエリを書くとクエリが複雑化・パフォーマンス劣化
        #    → stock_calculationサービスに委譲することで、ロジックを一元管理
        #
        # 2. ロック取得のタイミング
        #    → WITH FOR UPDATEはLotテーブルに対して発行
        #    → 利用可能数量の計算時にlot_reservationsも参照するが、別トランザクション
        #    → ロック取得後にPython側でフィルタすることで、正確な数量を取得
        #
        # 3. テスタビリティ
        #    → 利用可能数量の計算ロジックを独立してテスト可能
        #    → リポジトリ層とサービス層の責務分離
        #
        # トレードオフ:
        # - パフォーマンス: N+1問題の可能性（ロット数×予約数の計算）
        # - 精度: ロック取得後の計算で、最新の予約状況を反映
        from app.application.services.inventory.stock_calculation import (
            get_available_quantity,
        )

        candidates: list[LotCandidate] = []
        for lot in lots:
            available = float(get_available_quantity(self.db, lot))
            if available <= min_available_qty:
                continue

            candidates.append(
                LotCandidate(
                    lot_id=lot.id,
                    lot_code=lot.lot_number,
                    lot_number=lot.lot_number,
                    product_code=lot.product.maker_part_code if lot.product else "",
                    warehouse_code=lot.warehouse.warehouse_code if lot.warehouse else "",
                    available_qty=available,
                    expiry_date=lot.expiry_date,
                    receipt_date=lot.received_date,
                )
            )

        return candidates
