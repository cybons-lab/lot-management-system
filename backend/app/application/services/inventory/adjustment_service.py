"""在庫調整サービス層.

在庫調整の作成・取得・履歴管理のビジネスロジックを提供します。
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.inventory_models import (
    Adjustment,
    Adjustment,
    LotReceipt,
    StockHistory,
    StockTransactionType,
)
from app.presentation.schemas.inventory.inventory_schema import (
    AdjustmentCreate,
    AdjustmentResponse,
    AdjustmentType,
)


class AdjustmentService(BaseService[Adjustment, AdjustmentCreate, AdjustmentResponse, int]):
    """在庫調整のビジネスロジック.

    調整レコードは作成後は不変（immutable）であるため、
    AdjustmentResponseを更新スキーマとしても使用します。

    【設計意図】なぜ調整レコードは不変（immutable）なのか:

    1. 監査証跡の完全性
       理由: 在庫調整は会計・監査上の重要な記録
       → 一度記録したら変更・削除できないようにすることで、改ざんを防止
       例: 「過去の調整を修正」ではなく「新しい調整を追加」で対応
       → 履歴が完全に残る

    2. トラブルシューティングの容易性
       用途: 在庫不一致が発生した際の原因追跡
       → すべての調整記録が残っているため、「いつ誰がどのような調整をしたか」を遡れる
       → 人的ミスかシステムバグかを判別可能

    3. stock_historyとの整合性
       理由: 調整実行時に自動的にstock_historyレコードを作成
       → adjustmentを変更すると、stock_historyとの整合性が取れなくなる
       → どちらも不変にすることで、データの一貫性を保証

    4. 誤操作の訂正方法
       運用: 誤った調整を記録してしまった場合
       → 逆の調整レコードを追加（例: +10の誤記録なら-10を追加）
       → 元のレコードは残り、訂正の履歴も明確

    BaseServiceから基本操作を継承:
    - get_by_id(adjustment_id) -> Adjustment (AdjustmentResponseを返すようオーバーライド)

    在庫更新を伴う複雑なビジネスロジックを実装しています。
    """

    def __init__(self, db: Session):
        """在庫調整サービスを初期化.

        Args:
            db: データベースセッション
        """
        super().__init__(db=db, model=Adjustment)

    def get_adjustments(
        self,
        skip: int = 0,
        limit: int = 100,
        lot_id: int | None = None,
        adjustment_type: str | None = None,
    ) -> list[AdjustmentResponse]:
        """在庫調整履歴を取得（オプションでフィルタリング）.

        Args:
            skip: スキップ件数（ページネーション用）
            limit: 取得件数上限
            lot_id: ロットIDでフィルタ
            adjustment_type: 調整タイプでフィルタ

        Returns:
            在庫調整レコードのリスト
        """
        query = self.db.query(Adjustment)

        if lot_id is not None:
            query = query.filter(Adjustment.lot_id == lot_id)

        if adjustment_type is not None:
            query = query.filter(Adjustment.adjustment_type == adjustment_type)

        query = query.order_by(Adjustment.adjusted_at.desc())

        adjustments = query.offset(skip).limit(limit).all()

        return [
            AdjustmentResponse(
                id=adj.id,
                lot_id=adj.lot_id,
                adjustment_type=AdjustmentType(adj.adjustment_type),
                adjusted_quantity=adj.adjusted_quantity,
                reason=adj.reason,
                adjusted_by=adj.adjusted_by,
                adjusted_at=adj.adjusted_at,
            )
            for adj in adjustments
        ]

    def get_adjustment_by_id(self, adjustment_id: int) -> AdjustmentResponse | None:
        """在庫調整をIDで取得.

        Args:
            adjustment_id: 在庫調整ID

        Returns:
            在庫調整レコード、見つからない場合はNone
        """
        adjustment = self.db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()

        if not adjustment:
            return None

        return AdjustmentResponse(
            id=adjustment.id,
            lot_id=adjustment.lot_id,
            adjustment_type=AdjustmentType(adjustment.adjustment_type),
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
            adjusted_at=adjustment.adjusted_at,
        )

    def create_adjustment(self, adjustment: AdjustmentCreate) -> AdjustmentResponse:
        """在庫調整を作成.

        【設計意図】なぜこの順序で処理するのか:

        1. flush() - 調整レコード作成後（行153）
           理由: stock_historyのreference_idにadjustment.idが必要
           → flush()でSQLを発行してIDを取得するが、まだコミットしない
           → 後続処理（lot更新、history作成）と同一トランザクションで処理

        2. lot.current_quantity更新（行156）
           理由: 調整の本質は「ロットの現在数量を変更すること」
           タイミング: 調整レコード作成後、コミット前
           → 調整レコードとロット更新がアトミックに実行される
           → 片方だけコミットされる状態を防ぐ

        3. status = "depleted" 判定（行160-161）
           理由: 在庫0のロットを明示的にマークすることで、引当対象から除外
           トレードオフ: 調整で在庫が増えた場合のステータス復元は自動化されていない
           → 運用でカバー: 管理者が手動でステータスを戻す

        4. stock_history作成（行164-172）
           目的: すべての在庫変動を不変の履歴として記録
           理由:
           - 監査要件: 「いつ誰がどのような調整をしたか」を完全に追跡
           - トラブルシューティング: 在庫不一致の原因を特定
           - データ整合性: ロット残高を再計算できる（sum(stock_history.quantity_change)）
           フィールド設計:
           - reference_type="adjustment", reference_id=adjustment.id
             → 調整レコードへの参照を保持（調整理由等の詳細を追跡可能）

        5. commit() - 最後に全体を確定（行176）
           理由: 調整レコード + ロット更新 + 履歴レコードを1トランザクションで確定
           → 途中でエラーが発生したら、すべてロールバック
           → データの一貫性を保証

        Args:
            adjustment: 在庫調整作成データ

        Returns:
            作成された在庫調整レコード

        Raises:
            ValueError: ロットが見つからない場合、または調整後の数量がマイナスになる場合

        Note:
            - ロットのcurrent_quantityを更新
            - stock_historyレコードを作成
        """
        # Get lot
        lot = self.db.query(LotReceipt).filter(LotReceipt.id == adjustment.lot_id).first()

        if not lot:
            raise ValueError(f"Lot with id={adjustment.lot_id} not found")

        # Calculate new quantity
        new_quantity = lot.current_quantity + adjustment.adjusted_quantity

        if new_quantity < Decimal("0"):
            raise ValueError(
                f"Adjustment would result in negative quantity. "
                f"Current: {lot.current_quantity}, Adjustment: {adjustment.adjusted_quantity}"
            )

        # Create adjustment record
        db_adjustment = Adjustment(
            lot_id=adjustment.lot_id,
            adjustment_type=adjustment.adjustment_type,
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
        )

        self.db.add(db_adjustment)
        self.db.flush()  # Get ID for stock_history reference (but don't commit yet)

        # Update lot quantity
        lot.current_quantity = new_quantity
        lot.updated_at = utcnow()

        # Update lot status if necessary
        if new_quantity == Decimal("0"):
            lot.status = "depleted"

        # Create stock history record (immutable audit trail)
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.ADJUSTMENT,
            quantity_change=adjustment.adjusted_quantity,
            quantity_after=new_quantity,
            reference_type="adjustment",
            reference_id=db_adjustment.id,
            transaction_date=utcnow(),
        )

        self.db.add(stock_history)

        self.db.commit()  # Commit entire transaction (adjustment + lot update + history)
        self.db.refresh(db_adjustment)

        return AdjustmentResponse(
            id=db_adjustment.id,
            lot_id=db_adjustment.lot_id,
            adjustment_type=AdjustmentType(db_adjustment.adjustment_type),
            adjusted_quantity=db_adjustment.adjusted_quantity,
            reason=db_adjustment.reason,
            adjusted_by=db_adjustment.adjusted_by,
            adjusted_at=db_adjustment.adjusted_at,
        )
