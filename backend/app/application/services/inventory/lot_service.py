"""Lot repository and service utilities with FEFO support.

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。

【設計意図】ロットサービスの設計判断:

1. なぜ AllocationCandidateService に処理を委譲するのか（L84-141）
   理由: 引当候補取得のSSoT（Single Source of Truth）
   背景:
   - v3.0以前: LotService が FEFO候補を直接取得
   - v3.0以降: AllocationCandidateService が引当候補取得の責務を持つ
   → LotService は AllocationCandidateService を呼び出すだけ
   実装:
   - get_fefo_candidates(): AllocationCandidateService.get_candidates() に委譲
   メリット:
   - 引当候補ロジックが1箇所に集中 → 変更時の影響範囲を限定
   - FEFO/FIFO の切り替えが容易

2. なぜ assigned_supplier_ids で優先ソートするのか（L220-236）
   理由: 営業担当者の業務効率化
   業務的背景:
   - 営業担当者: 自分の担当サプライヤーのロットを優先的に確認
   → 一覧表示時に、担当ロットを上位に表示
   実装:
   - priority_case = case((supplier_id.in_(...), 0), else_=1)
   - ORDER BY priority_case ASC（0が優先）
   用途:
   - ロット一覧画面: 担当ロットが上位に表示 → 確認作業が効率化

3. なぜ temporary_lot_key と lot_number を分けるのか（L392-417）
   理由: 仮入庫対応
   業務フロー:
   - Step1: 入庫予定登録（ロット番号未確定）
   → temporary_lot_key（UUID）を発行
   - Step2: 実際の入庫時にロット番号を確定
   → lot_number を更新
   実装:
   - temporary_lot_key: UUID（システム内部での一意識別子）
   - lot_number: TMP-20251213-a1b2c3d4（ユーザー表示用の暫定番号）
   業務影響:
   - 入庫予定段階で引当可能（ロット番号未確定でもOK）

4. なぜ origin_type 別に lot_number を自動採番するのか（L335-341, L366-390）
   理由: 非受注ロットの識別
   業務的背景:
   - ORDER: 仕入先から受領したロット番号を使用
   - SAMPLE: サンプル用ロット → SMP-20250304-0001
   - SAFETY_STOCK: 安全在庫 → SAF-20250304-0001
   - ADHOC: 臨時入庫 → ADH-20250304-0001
   実装:
   - _generate_adhoc_lot_number(): プレフィックス + 日付 + 連番
   メリット:
   - プレフィックスでロットの起源を一目で識別

5. なぜ VLotDetails ビューを使うのか（L190-268, list_lots）
   理由: JOIN済みデータの高速取得
   問題:
   - Lot + Product + Supplier + Warehouse の4テーブルJOIN → 遅い
   解決:
   - VLotDetails: 事前にJOINしたビュー
   → 製品名、仕入先名、倉庫名を1回のクエリで取得
   実装:
   - query(VLotDetails).filter(...).all()
   メリット:
   - N+1問題を回避
   - ロット一覧の表示速度向上

6. なぜ Soft Delete 対応をするのか（L634-671）
   理由: 削除済みマスタの参照
   問題:
   - 製品マスタ削除 → 過去のロットで製品名が表示できない
   解決:
   - is_soft_deleted: マスタが削除済みかを判定
   - 削除済みの場合: "[削除済み製品]" と表示
   実装:
   - product_deleted = product.is_soft_deleted if ... else False
   - product_name = ... if not product_deleted else "[削除済み製品]"
   業務影響:
   - 過去のロット情報を正しく表示（マスタ削除後も）

7. なぜ lock_lot と unlock_lot があるのか（L471-542）
   理由: 手動での在庫ロック
   業務例:
   - 品質検査中のロット: 検査完了まで引当不可にしたい
   → lock_lot() で手動ロック
   実装:
   - locked_quantity: ロック数量
   - lock_reason: ロック理由（「検査中」等）
   用途:
   - 利用可能数量 = current_quantity - reserved_qty - locked_qty
   → ロックされた数量は引当対象外

8. なぜ StockMovement を記録するのか（L544-604）
   理由: 在庫変動の監査証跡
   業務要件:
   - 在庫不一致が発生した場合の原因追跡
   → すべての在庫変動を記録（Immutable）
   実装:
   - create_stock_movement(): StockMovement レコード作成
   - transaction_type: 入庫/出庫/調整等の種別
   - quantity_change: 変動数量
   - quantity_after: 変動後の数量
   メリット:
   - 「いつ、誰が、何個、どの理由で在庫を変動させたか」を完全に記録

9. なぜ EventDispatcher.queue() を呼ぶのか（L593-602）
   理由: ドメインイベントの発行
   用途:
   - StockChangedEvent: 在庫変動イベント
   → 在庫アラートの通知、外部システムへの連携等
   実装:
   - EventDispatcher.queue(event): イベントをキューに追加
   → リクエスト完了後に一括処理
   メリット:
   - 在庫変動処理と、通知・連携処理を疎結合に実装

10. なぜ IntegrityError を特別に処理するのか（L347-358, L453-458）
    理由: ユーザーフレンドリーなエラーメッセージ
    問題:
    - IntegrityError: "duplicate key value violates unique constraint..."
    → 技術的すぎて、ユーザーには分かりにくい
    解決:
    - uq_lots_number_product_warehouse: ロット番号の重複エラーを検出
    → "ロット番号「XXX」は既に存在します" と分かりやすく表示
    実装:
    - except IntegrityError: error_str から制約名を検出
    → LotValidationError で分かりやすいメッセージを返す
    業務影響:
    - ユーザーが自分で問題を解決できる
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import case, desc, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.stock_calculation import (
    get_available_quantity,
    get_reserved_quantity,
)
from app.core.time_utils import utcnow
from app.domain.lot import (
    InsufficientLotStockError,
    LotCandidate,
    LotDatabaseError,
    LotNotFoundError,
    LotProductNotFoundError,
    LotSupplierNotFoundError,
    LotValidationError,
    LotWarehouseNotFoundError,
    StockValidator,
)
from app.infrastructure.persistence.models import (
    LotMaster,
    LotReceipt,
    Product,
    StockMovement,
    StockTransactionType,
    Supplier,
    VLotDetails,
    Warehouse,
)
from app.infrastructure.persistence.repositories.lot_repository import LotRepository
from app.presentation.schemas.inventory.inventory_schema import (
    LotCreate,
    LotLock,
    LotOriginType,
    LotResponse,
    LotStatus,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)


logger = logging.getLogger(__name__)


class LotService:
    """ロット操作とFEFO候補取得のビジネスロジック.

    ロットの作成・更新・削除、在庫変動記録、引当候補の取得など、
    ロット在庫管理の中核となるビジネスロジックを提供します。
    """

    def __init__(self, db: Session):
        """サービスの初期化.

        Args:
            db: データベースセッション
        """
        self.db = db
        self.repository = LotRepository(db)

    def get_lot(self, lot_id: int) -> LotReceipt:
        """ロットを取得.

        Args:
            lot_id: ロットID

        Returns:
            LotReceipt: ロットエンティティ

        Raises:
            LotNotFoundError: ロットが存在しない場合
        """
        lot = self.repository.find_by_id(lot_id)
        if not lot:
            raise LotNotFoundError(lot_id)
        return lot

    def get_lot_details(self, lot_id: int) -> LotResponse:
        """ロット詳細を取得（VLotDetailsビュー使用）.

        Args:
            lot_id: ロットID

        Returns:
            LotResponse: ロット詳細情報（結合済み、計算済み）

        Raises:
            LotNotFoundError: ロットが存在しない場合
        """
        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            raise LotNotFoundError(lot_id)

        return LotResponse(
            id=lot_view.lot_id,
            lot_number=lot_view.lot_number,
            supplier_item_id=lot_view.supplier_item_id or 0,
            product_code=lot_view.maker_part_no or "",
            product_name=lot_view.display_name,
            supplier_id=lot_view.supplier_id,
            supplier_code=lot_view.supplier_code,
            supplier_name=lot_view.supplier_name or "",
            warehouse_id=lot_view.warehouse_id,
            warehouse_code=lot_view.warehouse_code,
            warehouse_name=lot_view.warehouse_name,
            # Explicit fields
            received_quantity=lot_view.received_quantity,
            remaining_quantity=lot_view.remaining_quantity or Decimal("0"),
            # 互換性フィールド (Remaining)
            current_quantity=lot_view.remaining_quantity or Decimal("0"),
            allocated_quantity=lot_view.allocated_quantity or Decimal("0"),
            reserved_quantity_active=getattr(lot_view, "reserved_quantity_active", Decimal("0")),
            available_quantity=getattr(lot_view, "available_quantity", Decimal("0")),
            locked_quantity=lot_view.locked_quantity or Decimal("0"),
            unit=lot_view.unit,
            received_date=lot_view.received_date,
            expiry_date=lot_view.expiry_date,
            status=LotStatus(lot_view.status) if lot_view.status else LotStatus.ACTIVE,
            lock_reason=lot_view.lock_reason,
            inspection_status=lot_view.inspection_status or "not_required",
            inspection_date=lot_view.inspection_date,
            inspection_cert_number=lot_view.inspection_cert_number,
            origin_type=LotOriginType(lot_view.origin_type)
            if lot_view.origin_type
            else LotOriginType.ORDER,
            origin_reference=lot_view.origin_reference,
            temporary_lot_key=lot_view.temporary_lot_key,
            shipping_date=lot_view.shipping_date,
            cost_price=lot_view.cost_price,
            sales_price=lot_view.sales_price,
            tax_rate=lot_view.tax_rate,
            product_deleted=lot_view.product_deleted,
            warehouse_deleted=lot_view.warehouse_deleted,
            supplier_deleted=lot_view.supplier_deleted,
            # Phase 2 Mapping
            maker_part_no=lot_view.supplier_maker_part_no,
            customer_part_no=lot_view.customer_part_no,
            mapping_status=lot_view.mapping_status,
            created_at=lot_view.created_at,
            updated_at=lot_view.updated_at,
        )

    def get_fefo_candidates(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        exclude_expired: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
    ) -> list[LotCandidate]:
        """FEFO引当候補ロットを取得.

        有効期限の早い順（FEFO: First Expiry First Out）に並べた引当候補ロットを返します。
        v2.2: Lot.current_quantity - Lot.allocated_quantityで利用可能数量を計算
        v2.3: デフォルトでサンプル/アドホック起源ロットを除外
        v3.0: AllocationCandidateService（SSOT）に処理を委譲

        Args:
            product_code: フィルタ対象の製品コード
            warehouse_code: 倉庫コードフィルタ（省略可）
            exclude_expired: 期限切れロットを除外するか（デフォルト: True）
            include_sample: サンプル起源ロットを含めるか（デフォルト: False）
            include_adhoc: アドホック起源ロットを含めるか（デフォルト: False）

        Returns:
            list[LotCandidate]: FEFO順に並んだ引当候補ロットのリスト
        """
        from app.application.services.allocations.candidate_service import (
            AllocationCandidateService,
        )
        from app.domain.allocation_policy import AllocationPolicy, LockMode

        # Resolve product_code to supplier_item_id
        product = self.db.query(Product).filter(Product.maker_part_no == product_code).first()
        if not product:
            return []

        # Resolve warehouse_code to warehouse_id if provided
        warehouse_id: int | None = None
        if warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                warehouse_id = warehouse.id
            else:
                return []

        # Delegate to SSOT
        candidate_service = AllocationCandidateService(self.db)
        return candidate_service.get_candidates(
            supplier_item_id=product.id,
            policy=AllocationPolicy.FEFO,
            lock_mode=LockMode.NONE,
            warehouse_id=warehouse_id,
            exclude_expired=exclude_expired,
            exclude_locked=False,  # Maintain backward compatibility
            include_sample=include_sample,
            include_adhoc=include_adhoc,
        )

    def validate_lot_availability(self, lot_id: int, required_qty: float) -> None:
        """ロットの在庫利用可能性を検証します。.


        lot_reservations を使用して利用可能数量を計算します。
        """
        lot = self.get_lot(lot_id)

        # 利用可能在庫を計算 (lot_reservationsを使用)
        available_qty = float(get_available_quantity(self.db, lot))

        StockValidator.validate_sufficient_stock(lot_id, required_qty, available_qty)
        StockValidator.validate_not_expired(lot_id, lot.expiry_date)

    def archive_lot(self, lot_id: int, confirmation_lot_number: str | None = None) -> LotResponse:
        """Archive a lot with optional confirmation for lots with remaining inventory.

        Archived lots are hidden from default views but retained for traceability.

        Args:
            lot_id: ロットID
            confirmation_lot_number: 確認用ロット番号（在庫がある場合は必須）

        Raises:
            LotValidationError: ロット番号が一致しない、または在庫がある場合に確認がない
        """
        lot = self.get_lot(lot_id)

        # Validation: If lot has inventory, require lot_number confirmation
        if lot.current_quantity > 0:
            from app.domain.lot import LotValidationError

            if not confirmation_lot_number:
                raise LotValidationError("在庫が残っているロットはアーカイブできません")

            # Verify lot_number matches (case-sensitive)
            if lot.lot_master.lot_number != confirmation_lot_number:
                raise LotValidationError("ロット番号が一致しません")

        # Update status
        # Note: status is a string column in DB
        lot.status = LotStatus.ARCHIVED.value
        self.db.add(lot)
        self.db.commit()
        self.db.refresh(lot)

        return self.get_lot_details(lot.id)

    # --- New Methods Extracted from Router ---

    def get_all(self, skip: int = 0, limit: int = 100) -> list[LotResponse]:
        """全ロットを取得します (一括エクスポート用)。."""
        return self.list_lots(skip=skip, limit=limit)

    def list_lots(
        self,
        skip: int = 0,
        limit: int = 100,
        supplier_item_id: int | None = None,
        product_code: str | None = None,
        supplier_code: str | None = None,
        warehouse_id: int | None = None,
        warehouse_code: str | None = None,
        expiry_from: date | None = None,
        expiry_to: date | None = None,
        with_stock: bool = True,
        status: str | None = None,
        assigned_supplier_ids: list[int] | None = None,
    ) -> list[LotResponse]:
        """List lots using VLotDetails view.

        Args:
            skip: スキップ件数
            limit: 取得件数
            supplier_item_id: 製品ID
            product_code: 製品コード
            supplier_code: 仕入先コード
            warehouse_id: 倉庫ID
            warehouse_code: 倉庫コード
            expiry_from: 有効期限開始日
            expiry_to: 有効期限終了日
            with_stock: 在庫ありのみ取得するかどうか
            status: ロットステータス（'active', 'expired', 'depleted' 等）
            assigned_supplier_ids: 担当仕入先IDリスト。指定された場合、これらを優先表示。

        Returns:
            LotResponseのリスト
        """
        query = self.db.query(VLotDetails)

        if supplier_item_id is not None:
            query = query.filter(VLotDetails.supplier_item_id == supplier_item_id)
        elif product_code:
            query = query.filter(VLotDetails.maker_part_no == product_code)

        if supplier_code:
            supplier = (
                self.db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
            )
            if supplier:
                query = query.filter(VLotDetails.supplier_id == supplier.id)

        # warehouse_id takes priority over warehouse_code
        if warehouse_id is not None:
            query = query.filter(VLotDetails.warehouse_id == warehouse_id)
        elif warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                query = query.filter(VLotDetails.warehouse_id == warehouse.id)

        if expiry_from:
            query = query.filter(VLotDetails.expiry_date >= expiry_from)
        if expiry_to:
            query = query.filter(VLotDetails.expiry_date <= expiry_to)

        if with_stock:
            query = query.filter(VLotDetails.available_quantity > 0)

        # Status filter (e.g., 'active' to match active_lot_count)
        if status:
            query = query.filter(VLotDetails.status == status)

        # ソート: 担当仕入先優先 → 製品コード → 仕入先 → 有効期限(FEFO)
        if assigned_supplier_ids:
            priority_case = case(
                (VLotDetails.supplier_id.in_(assigned_supplier_ids), 0),
                else_=1,
            )
            query = query.order_by(
                priority_case,
                VLotDetails.maker_part_no.asc(),
                VLotDetails.supplier_name.asc(),
                VLotDetails.expiry_date.asc().nullslast(),
            )
        else:
            query = query.order_by(
                VLotDetails.maker_part_no.asc(),
                VLotDetails.supplier_name.asc(),
                VLotDetails.expiry_date.asc().nullslast(),
            )

        lot_views = query.offset(skip).limit(limit).all()

        responses: list[LotResponse] = []
        for lot_view in lot_views:
            response = LotResponse(
                id=lot_view.lot_id,
                lot_number=lot_view.lot_number or "",
                supplier_item_id=lot_view.supplier_item_id or 0,
                product_code=lot_view.maker_part_no or "",
                product_name=lot_view.display_name,
                supplier_id=lot_view.supplier_id,
                supplier_code=lot_view.supplier_code,
                supplier_name=lot_view.supplier_name or "",
                warehouse_id=lot_view.warehouse_id,
                warehouse_code=lot_view.warehouse_code,
                warehouse_name=lot_view.warehouse_name,
                received_quantity=lot_view.received_quantity,
                remaining_quantity=lot_view.remaining_quantity or Decimal("0"),
                current_quantity=lot_view.remaining_quantity or Decimal("0"),
                allocated_quantity=lot_view.allocated_quantity or Decimal("0"),
                reserved_quantity_active=getattr(
                    lot_view, "reserved_quantity_active", Decimal("0")
                ),
                available_quantity=getattr(lot_view, "available_quantity", Decimal("0")),
                unit=lot_view.unit,
                received_date=lot_view.received_date,
                expiry_date=lot_view.expiry_date,
                status=LotStatus(lot_view.status) if lot_view.status else LotStatus.ACTIVE,
                created_at=lot_view.created_at,
                updated_at=lot_view.updated_at,
                is_assigned_supplier=bool(
                    assigned_supplier_ids and lot_view.supplier_id in assigned_supplier_ids
                ),
                # Phase 2 Mapping
                maker_part_no=lot_view.supplier_maker_part_no,
                customer_part_no=lot_view.customer_part_no,
                mapping_status=lot_view.mapping_status,
            )
            responses.append(response)
        return responses

    def search_lots(
        self,
        query: str | None = None,
        page: int = 1,
        size: int = 100,
        sort_by: str = "expiry_date",
        sort_order: str = "asc",
        supplier_item_id: int | None = None,
        warehouse_id: int | None = None,
        supplier_code: str | None = None,
        expiry_from: date | None = None,
        expiry_to: date | None = None,
        shipping_date_from: date | None = None,
        shipping_date_to: date | None = None,
        with_stock: bool = True,
        status: str | None = None,
    ) -> dict:
        """Search lots with pagination, sorting, and rich filtering."""
        from sqlalchemy import or_

        db_query = self.db.query(VLotDetails)

        # Keyword Search
        if query:
            search_pattern = f"%{query}%"
            db_query = db_query.filter(
                or_(
                    VLotDetails.lot_number.ilike(search_pattern),
                    VLotDetails.maker_part_no.ilike(search_pattern),
                    VLotDetails.display_name.ilike(search_pattern),
                    VLotDetails.origin_reference.ilike(search_pattern),
                )
            )

        # Exact Filters
        if supplier_item_id:
            db_query = db_query.filter(VLotDetails.supplier_item_id == supplier_item_id)
        if warehouse_id:
            db_query = db_query.filter(VLotDetails.warehouse_id == warehouse_id)
        if supplier_code:
            db_query = db_query.filter(VLotDetails.supplier_code == supplier_code)

        # Date Ranges
        if expiry_from:
            db_query = db_query.filter(VLotDetails.expiry_date >= expiry_from)
        if expiry_to:
            db_query = db_query.filter(VLotDetails.expiry_date <= expiry_to)

        # VLotDetails doesn't have shipping_date yet?
        # Checking VLotDetails definition in views_models.py...
        # Wait, I need to check if shipping_date is in VLotDetails.
        # It was added to Lot model, but VLotDetails is a VIEW.
        # Ideally the view should be updated in DB migration, but for now I might need to join Lot table or just rely on Lot filters if View is not updated.
        # Actually, let's check views_models.py again.

        if with_stock:
            db_query = db_query.filter(VLotDetails.available_quantity > 0)

        if status:
            db_query = db_query.filter(VLotDetails.status == status)

        # Total Count
        total = db_query.count()

        # Sorting
        sort_column = getattr(VLotDetails, sort_by, VLotDetails.expiry_date)
        if sort_order.lower() == "desc":
            if sort_by == "expiry_date":
                # nulls last behavior for desc might vary, generally we want known dates first or last?
                # Standard: desc puts nulls first usually in SQL, but we want valid dates?
                # Let's simple apply desc().nullslast()
                db_query = db_query.order_by(desc(sort_column).nullslast())
            else:
                db_query = db_query.order_by(desc(sort_column))
        else:
            db_query = db_query.order_by(sort_column.asc().nullslast())

        # Pagination
        skip = (page - 1) * size
        lot_views = db_query.offset(skip).limit(size).all()

        # Map to Response
        responses = []
        for lot_view in lot_views:
            # 注意: VLotDetails ビューには現在、Phase 1 フィールド (shipping_date など) が含まれていません。
            # ビューのマイグレーションなしでこれらをサポートするには、必要に応じて Lot エンティティから取得しますが、
            # リスト表示での N+1 問題は避けるべきです。
            # 理想的にはビューを更新すべきですが、現時点では欠落を許容するか、ビューからあるものをマッピングします。

            # list_lots と同様のロジックを適用
            response = LotResponse(
                id=lot_view.lot_id,
                lot_number=lot_view.lot_number,
                supplier_item_id=lot_view.supplier_item_id or 0,
                product_code=lot_view.maker_part_no or "",
                product_name=lot_view.display_name,
                supplier_id=lot_view.supplier_id,
                supplier_code=lot_view.supplier_code,
                supplier_name=lot_view.supplier_name or "",
                warehouse_id=lot_view.warehouse_id,
                warehouse_code=lot_view.warehouse_code,
                warehouse_name=lot_view.warehouse_name,
                current_quantity=lot_view.current_quantity or Decimal("0"),
                allocated_quantity=lot_view.allocated_quantity or Decimal("0"),
                reserved_quantity_active=getattr(
                    lot_view, "reserved_quantity_active", Decimal("0")
                ),
                available_quantity=getattr(lot_view, "available_quantity", Decimal("0")),
                unit=lot_view.unit,
                received_date=lot_view.received_date,
                expiry_date=lot_view.expiry_date,
                status=LotStatus(lot_view.status) if lot_view.status else LotStatus.ACTIVE,
                created_at=lot_view.created_at,
                updated_at=lot_view.updated_at,
                is_assigned_supplier=False,  # View doesn't have is_primary flag for current user easily
                # Phase 1 Fields
                origin_type=LotOriginType(lot_view.origin_type)
                if lot_view.origin_type
                else LotOriginType.ADHOC,
                origin_reference=lot_view.origin_reference,
                shipping_date=lot_view.shipping_date,
                cost_price=lot_view.cost_price,
                sales_price=lot_view.sales_price,
                tax_rate=lot_view.tax_rate,
                # Phase 2 Mapping
                maker_part_no=lot_view.supplier_maker_part_no,
                customer_part_no=lot_view.customer_part_no,
                mapping_status=lot_view.mapping_status,
            )
            responses.append(response)

        return {"items": responses, "total": total, "page": page, "size": size}

    def create_lot(self, lot_create: LotCreate) -> LotResponse:
        """Create a new lot.

        For non-order origin types (sample, safety_stock, adhoc),
        supplier_code is optional and lot number is auto-generated.
        """
        # Validation
        if not lot_create.supplier_item_id:
            raise LotValidationError("supplier_item_id は必須です")

        product = self.db.query(Product).filter(Product.id == lot_create.supplier_item_id).first()
        if not product:
            raise LotProductNotFoundError(lot_create.supplier_item_id)

        # Supplier validation: required only for ORDER origin type
        supplier = None
        if lot_create.supplier_id is not None:
            supplier = self.db.query(Supplier).filter(Supplier.id == lot_create.supplier_id).first()
            if not supplier:
                raise LotSupplierNotFoundError(f"ID={lot_create.supplier_id}")
        elif lot_create.supplier_code:
            supplier = (
                self.db.query(Supplier)
                .filter(Supplier.supplier_code == lot_create.supplier_code)
                .first()
            )
            if not supplier:
                raise LotSupplierNotFoundError(lot_create.supplier_code)

        warehouse_id: int | None = None
        if lot_create.warehouse_id is not None:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.id == lot_create.warehouse_id).first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"ID={lot_create.warehouse_id}")
            warehouse_id = warehouse.id
        elif lot_create.warehouse_code:
            warehouse = (
                self.db.query(Warehouse)
                .filter(Warehouse.warehouse_code == lot_create.warehouse_code)
                .first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"コード={lot_create.warehouse_code}")
            warehouse_id = warehouse.id
        else:
            raise LotValidationError("倉庫コードまたは倉庫IDを指定してください")

        lot_payload = lot_create.model_dump()
        lot_payload["warehouse_id"] = warehouse_id
        lot_payload["supplier_id"] = supplier.id if supplier else None
        lot_payload.pop("warehouse_code", None)
        lot_payload.pop("supplier_code", None)
        lot_payload.pop("product_code", None)
        # Lotモデルに存在しないフィールドを削除
        lot_payload.pop("allocated_quantity", None)

        # lot_number が未指定/空の場合は TMP-YYYYMMDD-XXXXXXXX 形式を生成
        # temporary_lot_key は UUID で自動生成
        if not lot_payload.get("lot_number") or lot_payload["lot_number"].strip() == "":
            import uuid
            from datetime import datetime

            # Generate temporary lot key (UUID)
            temp_uuid = uuid.uuid4()
            lot_payload["temporary_lot_key"] = temp_uuid

            # Generate TMP-format lot number: TMP-YYYYMMDD-first8chars
            today_str = datetime.now().strftime("%Y%m%d")
            uuid_prefix = str(temp_uuid).replace("-", "")[:8]
            lot_payload["lot_number"] = f"TMP-{today_str}-{uuid_prefix}"
        elif lot_create.origin_type != LotOriginType.ORDER:
            # Auto-generate lot number for non-order origin types if placeholder
            if lot_payload["lot_number"] == "AUTO":
                lot_payload["lot_number"] = self._generate_adhoc_lot_number(
                    lot_create.origin_type.value
                )

        # B-Plan: Find or create LotMaster
        # lot_master acts as the canonical source for lot_number
        # lot_numberがNullの場合は常に新規作成（同じNullロットを共有しない）
        lot_master = None
        if lot_payload["lot_number"] is not None:
            lot_master = (
                self.db.query(LotMaster)
                .filter(
                    LotMaster.lot_number == lot_payload["lot_number"],
                    LotMaster.supplier_item_id == lot_create.supplier_item_id,  # type: ignore[attr-defined]
                    LotMaster.supplier_id == (supplier.id if supplier else None),
                )
                .first()
            )

        if not lot_master:
            lot_master = LotMaster(
                lot_number=lot_payload["lot_number"],
                supplier_item_id=lot_create.supplier_item_id,
                supplier_id=supplier.id if supplier else None,
            )
            self.db.add(lot_master)
            self.db.flush()  # Generate ID

        lot_payload["lot_master_id"] = lot_master.id

        # Remove lot_number from payload as it is now a read-only property in Lot (LotReceipt)
        lot_payload.pop("lot_number", None)
        # Remove remaining_quantity as it is not in LotReceipt model (it's in LotBase schema)
        lot_payload.pop("remaining_quantity", None)
        # Compatibility: Map current_quantity from Schema (Initial) to received_quantity in Model
        # Only overwrite if received_quantity is not set (or 0) AND current_quantity is set (and > 0)
        current_qty = lot_payload.pop("current_quantity", Decimal("0"))
        if lot_payload.get("received_quantity", Decimal("0")) == Decimal("0") and current_qty > 0:
            lot_payload["received_quantity"] = current_qty

        # Set consumed_quantity to 0 for new lots (NOT NULL constraint)
        if "consumed_quantity" not in lot_payload:
            lot_payload["consumed_quantity"] = Decimal("0")

        try:
            db_lot = LotReceipt(**lot_payload)
            self.db.add(db_lot)
            self.db.flush()  # Generate ID for StockMovement

            # Create stock history record for intake tracking
            if db_lot.received_quantity and db_lot.received_quantity > 0:
                stock_movement = StockMovement(
                    lot_id=db_lot.id,
                    transaction_type=StockTransactionType.INBOUND,
                    quantity_change=db_lot.received_quantity,
                    quantity_after=db_lot.received_quantity,
                    reference_type="adhoc_intake",
                    reference_id=db_lot.id,
                )
                self.db.add(stock_movement)

            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            # 重複キーエラーを検出してユーザーフレンドリーなメッセージを返す
            error_str = str(exc.orig) if exc.orig else str(exc)
            logger.error(
                "Lot creation integrity error",
                extra={
                    "lot_number": lot_payload.get("lot_number"),
                    "product_code": lot_payload.get("product_code"),
                    "warehouse_code": lot_payload.get("warehouse_code"),
                    "error": error_str[:500],
                },
            )
            if (
                "uq_lots_number_product_warehouse" in error_str
                or "duplicate key" in error_str.lower()
            ):
                raise LotValidationError(
                    f"ロット番号「{lot_payload.get('lot_number', '')}」は既に存在します。別のロット番号を入力してください。"
                ) from exc
            raise LotDatabaseError("ロット作成時のDB整合性エラー", exc) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.error(
                "Lot creation database error",
                extra={
                    "lot_number": lot_payload.get("lot_number"),
                    "product_code": lot_payload.get("product_code"),
                    "warehouse_code": lot_payload.get("warehouse_code"),
                    "error_type": type(exc).__name__,
                },
                exc_info=True,
            )
            raise LotDatabaseError("ロット作成時のDBエラー", exc) from exc

        # Response Construction
        return self._build_lot_response(db_lot.id)

    def _generate_adhoc_lot_number(self, origin_type: str) -> str:
        """Generate lot number for non-order lots.

        Format: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
        Example: SAF-20250304-0001, SMP-20250304-0001
        """
        prefix_map = {
            "forecast": "FCT",
            "sample": "SMP",
            "safety_stock": "SAF",
            "adhoc": "ADH",
        }
        prefix = prefix_map.get(origin_type, "ADH")
        today = date.today().strftime("%Y%m%d")

        # Get today's sequence count
        count = (
            self.db.query(func.count(LotReceipt.id))
            .join(LotMaster)
            .filter(LotMaster.lot_number.like(f"{prefix}-{today}-%"))
            .scalar()
        )
        sequence = (count or 0) + 1
        return f"{prefix}-{today}-{sequence:04d}"

    def update_lot(self, lot_id: int, lot_update: LotUpdate) -> LotResponse:
        """Update an existing lot."""
        db_lot = self.db.query(LotReceipt).filter(LotReceipt.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        updates = lot_update.model_dump(exclude_unset=True)

        if "warehouse_id" in updates:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.id == updates["warehouse_id"]).first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"ID={updates['warehouse_id']}")
        elif "warehouse_code" in updates:
            warehouse = (
                self.db.query(Warehouse)
                .filter(Warehouse.warehouse_code == updates["warehouse_code"])
                .first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"コード={updates['warehouse_code']}")
            updates["warehouse_id"] = warehouse.id

        updates.pop("warehouse_code", None)

        # Special handling for lot_number (on LotMaster)
        if "lot_number" in updates:
            db_lot.lot_master.lot_number = updates.pop("lot_number")

        # Compatibility: Map current_quantity to received_quantity
        if "current_quantity" in updates:
            updates["received_quantity"] = updates.pop("current_quantity")

        for key, value in updates.items():
            setattr(db_lot, key, value)

        db_lot.updated_at = utcnow()

        try:
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            logger.error(
                "Lot update integrity error",
                extra={
                    "lot_id": lot_id,
                    "lot_number": db_lot.lot_master.lot_number if db_lot.lot_master else None,
                    "updates": list(updates.keys()),
                    "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
                },
            )
            raise LotDatabaseError("ロット更新時のDB整合性エラー", exc) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.error(
                "Lot update database error",
                extra={
                    "lot_id": lot_id,
                    "lot_number": db_lot.lot_master.lot_number if db_lot.lot_master else None,
                    "updates": list(updates.keys()),
                    "error_type": type(exc).__name__,
                },
                exc_info=True,
            )
            raise LotDatabaseError("ロット更新時のDBエラー", exc) from exc

        return self._build_lot_response(db_lot.id)

    def delete_lot(self, lot_id: int) -> None:
        """Delete a lot."""
        db_lot = self.db.query(LotReceipt).filter(LotReceipt.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        self.db.delete(db_lot)
        self.db.commit()

    def lock_lot(self, lot_id: int, lock_data: LotLock) -> LotResponse:
        """Lock lot quantity."""
        db_lot = self.db.query(LotReceipt).filter(LotReceipt.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        quantity_to_lock = lock_data.quantity
        current_qty = db_lot.current_quantity or Decimal(0)
        reserved_qty = get_reserved_quantity(self.db, lot_id)
        locked_qty = db_lot.locked_quantity or Decimal(0)
        available_qty = current_qty - reserved_qty - locked_qty

        if quantity_to_lock is None:
            quantity_to_lock = available_qty

        if quantity_to_lock < 0:
            raise LotValidationError("ロック数量は0以上である必要があります")

        if quantity_to_lock > available_qty:
            raise InsufficientLotStockError(lot_id, float(quantity_to_lock), float(available_qty))

        db_lot.locked_quantity = locked_qty + quantity_to_lock
        if lock_data.reason:
            db_lot.lock_reason = lock_data.reason

        db_lot.updated_at = utcnow()

        try:
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            logger.error(
                "Lot lock integrity error",
                extra={
                    "lot_id": lot_id,
                    "lot_number": db_lot.lot_master.lot_number if db_lot.lot_master else None,
                    "quantity_to_lock": float(quantity_to_lock),
                    "available_qty": float(available_qty),
                    "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
                },
            )
            raise LotDatabaseError("ロットロック時のDB整合性エラー", exc) from exc

        # Return view-based response
        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            # Fallback if view not updated immediately (though within txn usually fine)
            return self._build_lot_response(lot_id)
        return LotResponse.model_validate(lot_view)

    def unlock_lot(self, lot_id: int, unlock_data: LotLock | None = None) -> LotResponse:
        """Unlock lot quantity."""
        db_lot = self.db.query(LotReceipt).filter(LotReceipt.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        quantity_to_unlock = unlock_data.quantity if unlock_data else None
        locked_qty = db_lot.locked_quantity or Decimal(0)

        if quantity_to_unlock is None:
            # Full unlock
            db_lot.locked_quantity = Decimal(0)
            db_lot.lock_reason = None
            if db_lot.status == "locked":
                db_lot.status = "active"
        else:
            if quantity_to_unlock < 0:
                raise LotValidationError("解除数量は0以上である必要があります")
            if quantity_to_unlock > locked_qty:
                raise LotValidationError(
                    f"解除数量({quantity_to_unlock})がロック済み数量({locked_qty})を超えています"
                )
            db_lot.locked_quantity = locked_qty - quantity_to_unlock

        db_lot.updated_at = utcnow()
        self.db.commit()

        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            return self._build_lot_response(lot_id)
        return LotResponse.model_validate(lot_view)

    def create_stock_movement(self, movement: StockMovementCreate) -> StockMovementResponse:
        """Create a stock movement (history) and update lot quantity.

        v2.3: ドメインイベント(StockChangedEvent)を発行するように拡張。
        """
        from app.domain.events import EventDispatcher, StockChangedEvent

        lot = None
        quantity_before = Decimal("0")

        if movement.lot_id is not None:
            lot = self.db.query(LotReceipt).filter(LotReceipt.id == movement.lot_id).first()
            if not lot:
                raise LotNotFoundError(movement.lot_id)
            quantity_before = lot.current_quantity or Decimal("0")

        db_movement = StockMovement(
            lot_id=movement.lot_id,
            transaction_type=movement.transaction_type,
            quantity_change=movement.quantity_change,
            quantity_after=movement.quantity_after,
            reference_type=movement.reference_type,
            reference_id=movement.reference_id,
        )

        self.db.add(db_movement)

        quantity_after = quantity_before
        if movement.lot_id and lot:
            current_qty = float(lot.current_quantity or 0.0)
            projected_quantity = current_qty + float(movement.quantity_change)

            if projected_quantity < 0:
                self.db.rollback()
                raise InsufficientLotStockError(
                    movement.lot_id,
                    abs(float(movement.quantity_change)),
                    current_qty,
                )

            # B-Plan: lot.current_quantityは計算フィールドなので直接更新しない
            # quantity_afterとdb_movement.quantity_afterは計算値を使用
            lot.updated_at = utcnow()
            quantity_after = Decimal(str(projected_quantity))

            db_movement.quantity_after = Decimal(str(projected_quantity))

        self.db.commit()
        self.db.refresh(db_movement)

        # ドメインイベント発行
        if movement.lot_id:
            event = StockChangedEvent(
                lot_id=movement.lot_id,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                quantity_change=movement.quantity_change,
                reason=movement.reference_type or "",
            )
            EventDispatcher.queue(event)

        return StockMovementResponse.model_validate(db_movement)

    def list_lot_movements(self, lot_id: int) -> list[StockMovementResponse]:
        """List movements for a lot."""
        movements = (
            self.db.query(StockMovement)
            .filter(StockMovement.lot_id == lot_id)
            .order_by(StockMovement.transaction_date.desc())
            .all()
        )
        return [StockMovementResponse.model_validate(m) for m in movements]

    def _build_lot_response(self, lot_id: int) -> LotResponse:
        """Helper to build LotResponse from Lot model definition (joined
        load).
        """
        db_lot = (
            self.db.query(LotReceipt)
            .options(
                joinedload(LotReceipt.supplier_item),
                joinedload(LotReceipt.warehouse),
                joinedload(LotReceipt.supplier),
            )
            .filter(LotReceipt.id == lot_id)
            .first()
        )
        if not db_lot:
            raise LotNotFoundError(lot_id)

        # LotResponseの必須フィールドをリレーションから取得（削除済みマスタ対応）
        product = db_lot.supplier_item
        warehouse = db_lot.warehouse
        supplier = db_lot.supplier

        # 削除済みフラグの判定（SoftDeleteMixinのis_soft_deletedプロパティを使用）
        product_deleted = (
            product.is_soft_deleted if product and hasattr(product, "is_soft_deleted") else False
        )
        warehouse_deleted = (
            warehouse.is_soft_deleted
            if warehouse and hasattr(warehouse, "is_soft_deleted")
            else False
        )
        supplier_deleted = (
            supplier.is_soft_deleted if supplier and hasattr(supplier, "is_soft_deleted") else False
        )

        # 削除済みマスタの場合はフォールバック値を設定
        product_name = (
            product.display_name
            if product and not product_deleted
            else "[削除済み製品]"
            if product_deleted
            else ""
        )
        product_code = product.maker_part_no if product else ""
        supplier_name = (
            supplier.supplier_name
            if supplier and not supplier_deleted
            else "[削除済み仕入先]"
            if supplier_deleted
            else ""
        )
        supplier_code = supplier.supplier_code if supplier else None
        warehouse_name = (
            warehouse.warehouse_name
            if warehouse and not warehouse_deleted
            else "[削除済み倉庫]"
            if warehouse_deleted
            else None
        )
        warehouse_code = warehouse.warehouse_code if warehouse else None

        return LotResponse(
            id=db_lot.id,
            lot_number=db_lot.lot_number or "",
            supplier_item_id=db_lot.supplier_item_id or 0,
            warehouse_id=db_lot.warehouse_id,
            supplier_id=db_lot.supplier_id,
            supplier_code=supplier_code,
            supplier_name=supplier_name or "",
            received_quantity=db_lot.received_quantity,
            remaining_quantity=db_lot.received_quantity,  # Default to received for fresh lots / simple conversion
            current_quantity=db_lot.received_quantity,
            allocated_quantity=Decimal("0"),
            locked_quantity=db_lot.locked_quantity or Decimal("0"),
            expected_lot_id=db_lot.expected_lot_id,
            received_date=db_lot.received_date,
            expiry_date=db_lot.expiry_date,
            unit=db_lot.unit,
            status=LotStatus(db_lot.status) if db_lot.status else LotStatus.ACTIVE,
            lock_reason=db_lot.lock_reason,
            inspection_status=db_lot.inspection_status,
            inspection_date=db_lot.inspection_date,
            inspection_cert_number=db_lot.inspection_cert_number,
            origin_type=LotOriginType(db_lot.origin_type)
            if db_lot.origin_type
            else LotOriginType.ADHOC,
            origin_reference=db_lot.origin_reference,
            temporary_lot_key=str(db_lot.temporary_lot_key) if db_lot.temporary_lot_key else None,
            shipping_date=db_lot.shipping_date,
            cost_price=db_lot.cost_price,
            sales_price=db_lot.sales_price,
            tax_rate=db_lot.tax_rate,
            product_name=product_name,
            product_code=product_code,
            warehouse_name=warehouse_name,
            warehouse_code=warehouse_code,
            created_at=db_lot.created_at,
            updated_at=db_lot.updated_at,
            product_deleted=product_deleted,
            warehouse_deleted=warehouse_deleted,
            supplier_deleted=supplier_deleted,
            # Phase 2 Mapping (entity based)
            maker_part_no=None,
            customer_part_no=None,
            mapping_status=None,
        )
