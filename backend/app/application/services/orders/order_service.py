"""Order service layer aligned with SQLAlchemy 2.0 models.

【設計意図】受注サービスの設計判断:

1. なぜ Order と OrderLine に分けるのか
   理由: ヘッダ・明細パターンによる正規化
   業務的背景:
   - 自動車部品商社: 1つの受注に複数の製品明細が含まれる
   - 例: 受注#123（顧客A、受注日2024-01-10）
     → 明細1: 製品X 100個（納期2024-01-20）
     → 明細2: 製品Y 50個（納期2024-01-25）
   実装:
   - Order: ヘッダ情報（顧客、受注日、ステータス）
   - OrderLine: 明細情報（製品、数量、納期、引当ステータス）
   メリット:
   - データ重複を避ける（顧客情報を明細ごとに保持しない）
   - 明細ごとに引当・出荷を管理可能

2. なぜ selectinload で関連データを取得するのか（L103-105）
   理由: N+1問題を回避
   問題:
   - 100件の受注を取得 → 100回のクエリで明細を取得 → 遅い
   解決:
   - selectinload(Order.order_lines): 1回のクエリで全明細を取得
   → 合計2回のクエリで完了（受注取得 + 明細一括取得）
   実装:
   - selectinload: IN句を使った一括取得（SELECT * FROM order_lines WHERE order_id IN (...)）
   メリット:
   - 100件の受注でも、2回のクエリで全データ取得

3. なぜ v_order_line_details ビューを使うのか（L414-445）
   理由: 表示用の情報を事前にJOIN
   業務的背景:
   - 受注明細表示時: 製品名、サプライヤー名、納入先名が必要
   - 通常のORM: 5つのテーブルをJOIN → 遅い
   → v_order_line_details ビューで事前にJOIN
   実装:
   - v_order_line_details: order_line × product × supplier × delivery_place をJOIN
   - _populate_additional_info(): ビューから表示情報を取得
   メリット:
   - フロントエンドで必要な情報を1回のクエリで取得

4. なぜ converted_quantity を計算するのか（L262-275）
   理由: 単位変換による数量統一
   業務的背景:
   - 顧客発注: 外部単位（KG）
   - 社内管理: 内部単位（CAN）
   - 例: 製品A（1 CAN = 20 KG）
     → 顧客発注: 40 KG → converted_quantity = 2 CAN
   実装:
   - qty_per_internal_unit: 1内部単位あたりの外部単位数
   - converted_qty = order_quantity / qty_per_internal_unit
   用途:
   - 引当処理: converted_quantity を使って在庫を確保
   - 在庫管理: 内部単位で統一管理

5. なぜ KANBAN/SPOT は自動引当するのか（L296-316）
   理由: 受注種別による業務フロー分離
   業務ルール:
   - KANBAN: かんばん方式 → 受注即引当（自動）
   - SPOT: スポット受注 → 受注即引当（自動）
   - FORECAST_LINKED: 予測連動受注 → 手動引当
   実装:
   - order_type in ("KANBAN", "SPOT"): auto_reserve_line() を実行
   → ソフト引当を自動作成
   業務影響:
   - かんばん受注: 登録と同時に在庫確保 → 迅速な出荷

6. なぜロック機能（acquire_lock/release_lock）があるのか（L338-402）
   理由: 複数ユーザーの同時編集を防止
   問題:
   - ユーザーA: 受注#123 の明細を編集中
   - ユーザーB: 同時に受注#123 の明細を編集
   → 片方の変更が上書きされる（データ喪失）
   解決:
   - acquire_lock(): 受注をロック（10分間）
   - 他のユーザーは編集不可（OrderLockedError）
   - release_lock(): ロック解除
   実装:
   - locked_by_user_id: ロック取得ユーザー
   - lock_expires_at: ロック有効期限
   メリット:
   - 同時編集による競合を防止

7. なぜロックを自動延長するのか（L350-355）
   理由: 長時間の編集作業を許容
   業務的背景:
   - 営業担当者: 受注を編集中に電話がかかってきた → 10分経過
   → ロックが切れて、他のユーザーが編集開始 → 競合
   解決:
   - 同じユーザーがロック取得を再度実行 → 自動延長（10分追加）
   実装:
   - if order.locked_by_user_id == user_id: 延長
   業務影響:
   - 編集中のユーザーは、ロックを失わない

8. なぜ cancel_order() で全明細をキャンセルするのか（L327-336）
   理由: 受注全体のキャンセル = 全明細のキャンセル
   業務ルール:
   - 受注キャンセル: 全明細を一括でキャンセル
   → 一部明細のみキャンセルは別の機能（明細単位キャンセル）
   実装:
   - for line in order.order_lines: line.status = "cancelled"
   - order.status = "cancelled"
   バリデーション:
   - shipped/completed の明細はキャンセル不可 → InvalidOrderStatusError
   業務影響:
   - 出荷済み受注の誤キャンセルを防止

9. なぜ forecast_reference を持つのか（L287, L409）
   理由: 予測データと受注の紐付け
   業務フロー:
   - Step1: 予測データ登録（例: 2024年2月に100個必要）
   - Step2: 自動的に仮受注作成（FORECAST_LINKED）
   - Step3: 実際の受注が入ったら、仮受注を実受注に変換
   実装:
   - forecast_reference: "FC-{customer_id}-{delivery_place_id}-{product_group_id}-{forecast_date}"
   → 予測データとの紐付けキー
   用途:
   - 予測削除時: 関連する仮受注も削除
   - 予測更新時: 仮受注の数量も更新

10. なぜ duplicate status filter があるのか（L112-115）
    理由: コードの安全性のための二重チェック
    実装:
    - L112-113: if status: stmt = stmt.where(Order.status == status)
    - L114-115: if status: stmt = stmt.where(Order.status == status) （重複）
    → これはバグの可能性が高いが、実害はない（同じ条件を2回適用）
    注意:
    - 重複した条件は SQL的には問題ないが、コードの可読性は低下
    - リファクタリング時に削除推奨
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import cast

from sqlalchemy import case, exists, select
from sqlalchemy.orm import Session, selectinload

from app.application.services.common.soft_delete_utils import (
    get_customer_code,
    get_customer_name,
)
from app.domain.order import (
    InvalidOrderStatusError,
    OrderLockedError,
    OrderLockOwnershipError,
    OrderNotFoundError,
    OrderValidationError,
    ProductNotFoundError,
)
from app.infrastructure.persistence.models import (
    Customer,
    Order,
    OrderLine,
    Product,
    SupplierItem,
)
from app.presentation.schemas.orders.orders_schema import (
    OrderCreate,
    OrderLineResponse,
    OrderWithLinesResponse,
)


class OrderService:
    """受注関連のビジネスロジックをカプセル化.

    受注の作成・更新・削除、明細管理、ステータス遷移など、
    受注管理の中核となるビジネスロジックを提供します。
    """

    def __init__(self, db: Session):
        """サービスの初期化.

        Args:
            db: データベースセッション
        """
        self.db = db

    def get_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        order_type: str | None = None,
        assigned_supplier_ids: list[int] | None = None,
    ) -> list[OrderWithLinesResponse]:
        """受注一覧を取得（明細含む）.

        主担当サプライヤーの製品を含む受注を優先的にソートします。

        【設計意図】なぜ主担当サプライヤー優先ソートが必要なのか:

        1. ユーザーの業務効率化
           用途: 自動車部品商社では、営業担当者は自分の担当サプライヤーの製品を優先的に処理
           理由: 各営業が複数のサプライヤーを担当し、受注が混在している状態
           → 自分の担当製品を含む受注を上位に表示することで、処理すべき受注を素早く発見

        2. priority_scoreロジック
           仕組み: SQLのCASE式を使い、主担当製品を含む受注にスコア0、それ以外に1を付与
           → スコア0が優先（ORDER BY priority_score ASC相当）
           → 同じスコア内では受注日降順（最新が上）

        3. EXISTS サブクエリの理由
           なぜJOINではなくEXISTSか:
           - 1つの受注に複数の明細行があり、複数のサプライヤーが混在する可能性
           - EXISTS: 「1つでも該当製品があればtrue」= 重複なし
           - JOIN: 該当製品の数だけ受注レコードが重複 → DISTINCT必要、パフォーマンス劣化
           → EXISTSの方が効率的かつシンプル

        4. デフォルトソート（assigned_supplier_ids未指定時）
           理由: 全受注を見る場合は、新しい受注を優先表示
           → 通常の業務フロー（新規受注から処理）に沿った設計

        Args:
            skip: スキップ件数（ページネーション用）
            limit: 取得件数（最大100件）
            status: ステータスフィルタ
            customer_code: 顧客コードフィルタ
            date_from: 受注日開始日フィルタ
            date_to: 受注日終了日フィルタ
            order_type: 受注種別フィルタ
            assigned_supplier_ids: 主担当サプライヤーIDリスト（優先ソート用）

        Returns:
            list[OrderWithLinesResponse]: 受注情報のリスト（明細含む）
        """
        stmt = select(Order).options(  # type: ignore[assignment]
            selectinload(Order.order_lines).selectinload(OrderLine.supplier_item)
        )

        if customer_code:
            # JOIN Customer table to filter by customer_code
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )
        if status:
            stmt = stmt.where(Order.status == status)
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)
        if order_type:
            stmt = stmt.where(Order.order_lines.any(OrderLine.order_type == order_type))

        # Primary supplier priority sort
        # 【設計】主担当製品を含む受注を優先表示（スコア0 = 高優先度）
        if assigned_supplier_ids:
            # Create a subquery to check if any order line's product is associated
            # with the user's primary suppliers
            has_primary_product = exists(
                select(OrderLine.id)
                .join(
                    SupplierItem,
                    SupplierItem.id == OrderLine.supplier_item_id,
                )
                .where(
                    OrderLine.order_id == Order.id,
                    SupplierItem.supplier_id.in_(assigned_supplier_ids),
                )
            )
            priority_score = case(
                (has_primary_product, 0),  # Priority 0 = highest priority
                else_=1,
            )
            stmt = stmt.order_by(priority_score, Order.order_date.desc())
        else:
            stmt = stmt.order_by(Order.order_date.desc())

        stmt = stmt.offset(skip).limit(limit)
        orders = self.db.execute(stmt).scalars().all()

        # Convert to Pydantic models
        response_orders = [OrderWithLinesResponse.model_validate(order) for order in orders]

        # Populate additional info
        self._populate_additional_info(response_orders)

        # Populate customer_valid_to for lines
        for r_order, m_order in zip(response_orders, orders, strict=False):
            if m_order.customer:
                c_valid_to = m_order.customer.valid_to
                for line in r_order.lines:
                    line.customer_valid_to = c_valid_to

        return response_orders

    def get_all(self, skip: int = 0, limit: int = 100) -> list[OrderLineResponse]:
        """Get all order lines for bulk export."""
        return self.get_order_lines(skip=skip, limit=limit)

    def get_order_lines(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        product_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        order_type: str | None = None,
    ) -> list[OrderLineResponse]:
        """Get flattened order lines with filtering."""
        stmt = (
            select(OrderLine)
            .join(Order, OrderLine.order_id == Order.id)
            .options(
                selectinload(OrderLine.order).selectinload(Order.customer),
                selectinload(OrderLine.supplier_item),
            )
        )

        if customer_code:
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )

        if product_code:
            stmt = stmt.join(Product, OrderLine.supplier_item_id == Product.id).where(
                Product.maker_part_no == product_code
            )

        if status:
            stmt = stmt.where(OrderLine.status == status)

        if date_from:
            stmt = stmt.where(OrderLine.delivery_date >= date_from)
        if date_to:
            stmt = stmt.where(OrderLine.delivery_date <= date_to)
        if order_type:
            stmt = stmt.where(OrderLine.order_type == order_type)

        stmt = stmt.order_by(OrderLine.delivery_date.asc()).offset(skip).limit(limit)
        lines = self.db.execute(stmt).scalars().all()

        # Convert to Pydantic models
        response_lines = []
        for line in lines:
            resp = OrderLineResponse.model_validate(line)
            # Manually populate flattened fields from relations
            if line.order:
                resp.customer_id = line.order.customer_id
                resp.order_date = line.order.order_date
                customer = line.order.customer
                resp.customer_name = get_customer_name(customer) or None
                resp.customer_code = get_customer_code(customer) or None
                resp.customer_valid_to = customer.valid_to if customer else None

            # P3: lot_reservations don't have lot_number directly
            # lot info is available via reservation.lot_receipt.lot_number if needed

            response_lines.append(resp)

        # Populate additional info (product details, etc.)
        self._populate_line_additional_info(response_lines)

        return response_lines

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        # Load order with related data (DDL v2.2 compliant)
        stmt = (  # type: ignore[assignment]
            select(Order)
            .options(
                selectinload(Order.order_lines).selectinload(OrderLine.supplier_item),
                selectinload(Order.customer),
            )
            .where(Order.id == order_id)
        )
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        response_order = cast(OrderWithLinesResponse, OrderWithLinesResponse.model_validate(order))
        self._populate_additional_info([response_order])
        return response_order

    def create_order(self, order_data: OrderCreate) -> OrderWithLinesResponse:
        # Validate customer_id exists
        customer_stmt = select(Customer).where(Customer.id == order_data.customer_id)
        customer = self.db.execute(customer_stmt).scalar_one_or_none()
        if not customer:
            raise OrderValidationError(f"Customer not found for ID {order_data.customer_id}")

        # Create order (DDL v2.2 compliant - no order_number)
        order = Order(
            customer_id=order_data.customer_id,
            order_date=order_data.order_date,
        )
        self.db.add(order)
        self.db.flush()

        # Track lines that need auto-allocation (KANBAN/SPOT)
        lines_for_auto_alloc: list[int] = []

        # Create order lines
        for line_data in order_data.lines:
            # Validate supplier_item_id exists
            product_stmt = select(Product).where(Product.id == line_data.supplier_item_id)
            product = self.db.execute(product_stmt).scalar_one_or_none()
            if not product:
                raise ProductNotFoundError(str(line_data.supplier_item_id))

            # Calculate converted_quantity
            converted_qty = line_data.order_quantity
            if product.internal_unit and product.qty_per_internal_unit:
                if line_data.unit == product.internal_unit:
                    converted_qty = line_data.order_quantity
                elif line_data.unit == product.external_unit:
                    # external -> internal (e.g. KG -> CAN)
                    # 1 CAN = 20 KG => 40 KG = 2 CAN
                    # qty = 40 / 20 = 2
                    converted_qty = line_data.order_quantity / product.qty_per_internal_unit
                else:
                    # Unknown unit, raise error for data integrity
                    raise OrderValidationError(
                        f"Unknown unit '{line_data.unit}' for product {product.maker_part_no}. "
                        f"Expected internal='{product.internal_unit}' or external='{product.external_unit}'."
                    )

            # Create order line (DDL v2.2 compliant)
            line = OrderLine(
                order_id=order.id,
                supplier_item_id=line_data.supplier_item_id,
                delivery_date=line_data.delivery_date,
                order_quantity=line_data.order_quantity,
                unit=line_data.unit,
                converted_quantity=converted_qty,
                delivery_place_id=line_data.delivery_place_id,
                order_type=line_data.order_type,
                forecast_reference=str(line_data.forecast_id) if line_data.forecast_id else None,
                customer_order_no=line_data.customer_order_no,
                customer_order_line_no=line_data.customer_order_line_no,
                sap_order_no=line_data.sap_order_no,
                sap_order_item_no=line_data.sap_order_item_no,
            )
            self.db.add(line)
            self.db.flush()

            # Track KANBAN/SPOT lines for auto-allocation
            if line_data.order_type in ("KANBAN", "SPOT"):
                lines_for_auto_alloc.append(line.id)

        self.db.flush()
        self.db.refresh(order)

        # Auto-allocate KANBAN/SPOT lines (Soft allocation)
        if lines_for_auto_alloc:
            from app.application.services.allocations.actions import auto_reserve_line

            for line_id in lines_for_auto_alloc:
                # Use nested transaction (savepoint) for allocation
                try:
                    with self.db.begin_nested():
                        auto_reserve_line(self.db, line_id)
                except Exception as e:
                    # Log but don't fail order creation
                    import logging

                    logging.getLogger(__name__).warning(
                        f"Auto-allocation failed for line {line_id} (soft failure handled): {e}"
                    )

        return cast(OrderWithLinesResponse, OrderWithLinesResponse.model_validate(order))

    def cancel_order(self, order_id: int) -> None:
        # Load order with lines
        stmt = select(Order).options(selectinload(Order.order_lines)).where(Order.id == order_id)
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        # Cancel all lines
        for line in order.order_lines:
            if line.status in {"shipped", "completed"}:
                raise InvalidOrderStatusError(line.status, "cancel")
            line.status = "cancelled"

        order.status = "cancelled"

        self.db.flush()

    def acquire_lock(self, order_id: int, user_id: int) -> dict:
        """Acquire edit lock for an order."""
        # Use pessimistic locking: SELECT ... FOR UPDATE NOWAIT
        # This prevents race conditions where two users check "locked_by" simultaneously
        stmt = (
            select(Order)
            .options(selectinload(Order.locked_by_user))
            .where(Order.id == order_id)
            .with_for_update(nowait=True)
        )

        try:
            # Note: handle DBAPIError/OperationalError if row is locked by another transaction
            order = self.db.execute(stmt).scalar_one_or_none()
        except Exception:
            # If we cannot acquire row lock, it means another transaction is working on it
            # For simplicity, treat as locked, or let it propagate if handled upstream
            # Generally with_for_update(nowait=True) raises OperationalError
            raise OrderLockedError(
                order_id=order_id,
                locked_by_user_name="Another Transaction",
                locked_at=None,
            )

        if not order:
            raise OrderNotFoundError(order_id)

        from app.core.time_utils import utcnow

        now = utcnow()

        # Check existing lock (logical lock)
        if order.locked_by_user_id and order.lock_expires_at:
            if order.lock_expires_at > now:
                # If locked by same user, extend lock
                if order.locked_by_user_id == user_id:
                    order.lock_expires_at = now + timedelta(minutes=10)
                    self.db.flush()  # Commit is handled by caller or UoW
                    return {"message": "Lock renewed"}
                else:
                    # Locked by another user
                    locked_by_name = (
                        order.locked_by_user.username if order.locked_by_user else "Unknown User"
                    )
                    raise OrderLockedError(
                        order_id=order.id,
                        locked_by_user_name=locked_by_name,
                        locked_at=order.locked_at,
                    )

        # Acquire lock
        order.locked_by_user_id = user_id
        order.locked_at = now
        order.lock_expires_at = now + timedelta(minutes=10)
        self.db.flush()

        return {
            "message": "Lock acquired",
            "locked_by_user_id": user_id,
            "locked_at": now.isoformat(),
            "lock_expires_at": order.lock_expires_at.isoformat(),
        }

    def release_lock(self, order_id: int, user_id: int) -> dict:
        """Release edit lock for an order."""
        order = self.db.get(Order, order_id)
        if not order:
            raise OrderNotFoundError(order_id)

        # Only lock owner can release
        if order.locked_by_user_id != user_id:
            if order.locked_by_user_id is None:
                return {"message": "Lock already released"}

            raise OrderLockOwnershipError(
                order_id=order.id,
                current_user_id=user_id,
                locked_by_user_id=order.locked_by_user_id,
            )

        order.locked_by_user_id = None
        order.locked_at = None
        order.lock_expires_at = None
        self.db.flush()

        return {"message": "Lock released"}

    def _populate_additional_info(self, orders: list[OrderWithLinesResponse]) -> None:
        """Populate additional display info using v_order_line_details view."""
        if not orders:
            return

        order_ids = [order.id for order in orders]
        if not order_ids:
            return

        # Fetch details from view
        query = """
            SELECT 
                order_id, line_id, 
                supplier_name, 
                product_code, product_name, product_internal_unit, product_external_unit, product_qty_per_internal_unit,
                delivery_place_name
            FROM v_order_line_details
            WHERE order_id IN :order_ids
        """

        from sqlalchemy import text

        rows = self.db.execute(text(query), {"order_ids": tuple(order_ids)}).fetchall()

        # Map details by line_id
        details_map = {row.line_id: row for row in rows}

        # Update lines
        for order in orders:
            for line in order.lines:
                detail = details_map.get(line.id)
                if detail:
                    line.supplier_name = detail.supplier_name
                    line.product_code = detail.product_code
                    line.product_name = detail.product_name
                    line.product_internal_unit = detail.product_internal_unit
                    line.product_external_unit = detail.product_external_unit
                    line.product_qty_per_internal_unit = float(
                        detail.product_qty_per_internal_unit or 1.0
                    )
                    line.delivery_place_name = detail.delivery_place_name

    def _populate_line_additional_info(self, lines: list[OrderLineResponse]) -> None:
        """Populate additional display info for a list of OrderLineResponse."""
        if not lines:
            return

        line_ids = [line.id for line in lines]
        if not line_ids:
            return

        # Fetch details from view
        query = """
            SELECT 
                line_id, 
                supplier_name, 
                product_code, product_name, product_internal_unit, product_external_unit, product_qty_per_internal_unit,
                delivery_place_name
            FROM v_order_line_details
            WHERE line_id IN :line_ids
        """

        from sqlalchemy import text

        rows = self.db.execute(text(query), {"line_ids": tuple(line_ids)}).fetchall()

        # Map details by line_id
        details_map = {row.line_id: row for row in rows}

        # Update lines
        for line in lines:
            detail = details_map.get(line.id)
            if detail:
                line.supplier_name = detail.supplier_name
                line.product_code = detail.product_code
                line.product_name = detail.product_name
                line.product_internal_unit = detail.product_internal_unit
                line.product_external_unit = detail.product_external_unit
                line.product_qty_per_internal_unit = float(
                    detail.product_qty_per_internal_unit or 1.0
                )
                line.delivery_place_name = detail.delivery_place_name
