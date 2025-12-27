# backend/app/repositories/allocation_repository.py
"""予約リポジトリ - P3: LotReservation ベースに完全移行.

v3.0: Allocation を廃止し、LotReservation のみを使用。
"""

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


class ReservationRepository:
    """予約リポジトリ（P3: LotReservation ベース）."""

    def __init__(self, db: Session, enable_history: bool = True):
        self.db = db
        self._enable_history = enable_history
        self._history_service = None

    @property
    def history_service(self):
        """Lazy load history service.

        【設計意図】なぜ遅延ロード（Lazy Loading）なのか:

        1. 循環import の回避
           理由: LotReservationHistoryServiceがこのリポジトリを使う可能性がある
           → __init__時にimportすると循環参照エラー
           → 実際に使用するタイミングでimportすることで回避

        2. パフォーマンス最適化
           理由: 履歴記録が不要なケース（enable_history=False）では、
           　　　サービスのインスタンス化コストが無駄
           → 必要になった時点で初めて生成

        3. テスト容易性
           理由: 履歴機能なしでのテストが簡単になる
           → enable_history=Falseで初期化すれば、履歴サービスは一切ロードされない
        """
        if self._history_service is None and self._enable_history:
            from app.application.services.inventory.lot_reservation_history_service import (
                LotReservationHistoryService,
            )

            self._history_service = LotReservationHistoryService(self.db)
        return self._history_service

    def find_by_id(self, reservation_id: int) -> LotReservation | None:
        """IDで予約を取得.

        Args:
            reservation_id: 予約ID

        Returns:
            予約エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(LotReservation)
            .options(joinedload(LotReservation.lot))
            .where(LotReservation.id == reservation_id)
        )
        return cast(LotReservation | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_line_id(self, order_line_id: int) -> list[LotReservation]:
        """受注明細IDで予約を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            予約エンティティのリスト
        """
        stmt = (
            select(LotReservation)
            .where(
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.source_id == order_line_id,
            )
            .order_by(LotReservation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_active_by_lot_id(self, lot_id: int) -> list[LotReservation]:
        """ロットIDでアクティブな予約を取得.

        Args:
            lot_id: ロットID

        Returns:
            アクティブな予約エンティティのリスト
        """
        stmt = (
            select(LotReservation)
            .where(
                LotReservation.lot_id == lot_id,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .order_by(LotReservation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_active_by_lot_number(self, lot_number: str) -> list[LotReservation]:
        """ロット番号でアクティブな予約を取得.

        Args:
            lot_number: ロット番号

        Returns:
            アクティブな予約エンティティのリスト
        """
        lot = self.db.execute(select(Lot).where(Lot.lot_number == lot_number)).scalar_one_or_none()
        if not lot:
            return []
        return self.find_active_by_lot_id(lot.id)

    def create(
        self,
        lot_id: int,
        source_type: ReservationSourceType,
        source_id: int,
        reserved_qty: float,
        status: ReservationStatus = ReservationStatus.ACTIVE,
    ) -> LotReservation:
        """予約を作成.

        【設計意図】なぜflush()してから履歴記録なのか:

        1. 履歴レコードに予約IDが必要
           理由: lot_reservation_historyテーブルはreservation_idを外部キーとして持つ
           → flush()しないとreservation.idがNoneのままで履歴レコードを作れない

        2. トランザクション一貫性
           理由: 予約レコードと履歴レコードを同一トランザクションで作成
           → 片方だけコミットされて、もう片方が失敗する状態を防ぐ
           → flush()は中間コミットではなく、単にSQLを発行してIDを取得するだけ

        3. 監査要件への対応
           理由: すべての予約操作を履歴として記録することで、
           　　　「いつ誰がどの在庫を引き当てたか」を完全にトレース可能
           → 問い合わせ対応やトラブルシューティングに必須

        Args:
            lot_id: ロットID
            source_type: ソースタイプ (ORDER, FORECAST, MANUAL)
            source_id: ソースID（order_line_id 等）
            reserved_qty: 予約数量
            status: ステータス（デフォルト: ACTIVE）

        Returns:
            作成された予約エンティティ
        """
        from decimal import Decimal

        reservation = LotReservation(
            lot_id=lot_id,
            source_type=source_type,
            source_id=source_id,
            reserved_qty=Decimal(str(reserved_qty)),
            status=status,
            created_at=utcnow(),
        )
        self.db.add(reservation)
        self.db.flush()  # Get ID for history record

        # Record history
        if self.history_service:
            self.history_service.record_insert(
                reservation=reservation,
                change_reason=f"Created via {source_type.value}",
            )

        return reservation

    def update_status(
        self,
        reservation: LotReservation,
        new_status: ReservationStatus,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> None:
        """予約ステータスを更新.

        【設計意図】なぜステータス変更時に履歴記録が必要なのか:

        1. ビジネス上の重要性
           理由: 予約のステータス遷移は在庫の可用性に直接影響
           例:
           - ACTIVE → CONFIRMED: SAP登録完了、正式な在庫確保
           - CONFIRMED → RELEASED: 出荷完了または受注キャンセル
           → これらの変更履歴がないと、「なぜこの時点で在庫が不足したのか」が追跡できない

        2. 問題発生時の原因究明
           用途: 在庫不足や二重引当などのトラブル発生時
           → 履歴を遡ることで「誰がいつどの予約を確定・解放したか」を特定
           → 人的ミスかシステムバグかを切り分けられる

        3. 監査証跡としての要件
           理由: 在庫管理は会計・財務と直結（棚卸資産評価）
           → 監査時に「在庫の動きが説明可能」であることが求められる
           → 変更者（changed_by）と変更理由（change_reason）を記録

        4. SAP連携の追跡
           用途: SAP登録成功/失敗の履歴を残す
           → ACTIVE → CONFIRMED の変更履歴にSAP連携情報を付加
           → 連携エラー時のリトライや手動対応の判断材料

        Args:
            reservation: 予約エンティティ
            new_status: 新しいステータス
            changed_by: 変更者（任意）
            change_reason: 変更理由（任意）
        """
        old_status = reservation.status
        reservation.status = new_status
        reservation.updated_at = utcnow()

        if new_status == ReservationStatus.CONFIRMED:
            reservation.confirmed_at = utcnow()
        elif new_status == ReservationStatus.RELEASED:
            reservation.released_at = utcnow()

        # Record history
        if self.history_service:
            self.history_service.record_status_change(
                reservation=reservation,
                old_status=old_status,
                changed_by=changed_by,
                change_reason=change_reason,
            )

    def release(self, reservation: LotReservation) -> None:
        """予約を解放（論理削除）.

        Args:
            reservation: 予約エンティティ
        """
        self.update_status(reservation, ReservationStatus.RELEASED)

    def get_lot(self, lot_id: int) -> Lot | None:
        """ロットを取得.

        Args:
            lot_id: ロットID

        Returns:
            ロットエンティティ（存在しない場合はNone）
        """
        stmt = select(Lot).where(Lot.id == lot_id)
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())


# Backward compatibility alias
AllocationRepository = ReservationRepository
