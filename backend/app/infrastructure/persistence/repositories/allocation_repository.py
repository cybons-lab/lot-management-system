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
    """予約リポジトリ（P3: LotReservation ベース）.

    【設計意図】予約リポジトリの設計判断:

    1. なぜ Allocation から LotReservation に移行したのか（v3.0）
       理由: 予約の概念を拡張し、将来の機能拡張に対応
       背景:
       - v2.x: Allocation（受注に対する引当のみ）
       - v3.x: LotReservation（受注、フォーキャスト、手動予約等に対応）
       → 予約のソースタイプ（ORDER, FORECAST, MANUAL）を明示
       業務的意義:
       - 受注以外の理由でロットを予約可能（例: 納期確約、見込み生産）
       - 複数の予約ソースを統一的に管理

    2. enable_history の設計（L24, L26）
       理由: 履歴記録の有効/無効を制御
       用途:
       - 本番環境: enable_history=True（全操作を記録）
       - テスト環境: enable_history=False（履歴記録をスキップ）
       メリット:
       - テスト実行速度の向上
       - 循環依存のデバッグが容易

    3. 遅延ロード（Lazy Loading）の採用（L29-55）
       理由: 循環importの回避とパフォーマンス最適化
       設計:
       - history_service を @property で実装
       → 初回アクセス時にLotReservationHistoryServiceをインスタンス化
       メリット:
       - 循環参照エラー防止
       - 履歴機能不要時のオーバーヘッド削減

    4. find_by_order_line_id() の設計（L73-90）
       理由: 受注明細に紐付く全予約を取得
       業務シナリオ:
       - 受注100個に対して、複数ロットから引当（50個+50個）
       → order_line_id で検索すると2件の予約が返る
       用途:
       - 引当状況の確認
       - 引当キャンセル時の一括解放

    5. find_active_by_lot_id() の設計（L92-109）
       理由: ロット別の予約状況を把握
       フィルタ条件:
       - status IN (ACTIVE, CONFIRMED)
       → 解放済み（RELEASED）は除外
       業務的意義:
       - ロットの利用可能数量計算
       → current_quantity - sum(active予約の reserved_qty)

    6. flush() の使用理由（L172）
       理由: 履歴レコードに予約IDが必要
       動作:
       - db.add(reservation) → メモリ上のオブジェクト追加
       - db.flush() → INSERT発行、IDを取得（コミットはしない）
       - history_service.record_insert() → 履歴レコード作成（IDを使用）
       - db.commit() → 一括コミット（サービス層で実行）
       メリット:
       - 予約と履歴を同一トランザクションで作成
       → 整合性保証

    7. Decimal 型への変換（L167）
       理由: 数量計算の精度保証
       変換:
       - Decimal(str(reserved_qty))
       → float → str → Decimal で精度誤差を防止
       業務影響:
       - 在庫数量の計算誤差防止
       → 0.1 + 0.2 = 0.30000000000000004 のようなバグを回避

    8. ステータス遷移時の日時記録（L226-229）
       理由: 各ステータスの確定日時を記録
       記録項目:
       - CONFIRMED → confirmed_at: SAP登録完了日時
       - RELEASED → released_at: 解放日時
       業務的意義:
       - 引当から確定までのリードタイム分析
       - SAP連携のパフォーマンス測定

    9. update_status() での履歴記録（L232-238）
       理由: ステータス変更の完全な追跡
       記録内容:
       - old_status → new_status（遷移履歴）
       - changed_by（変更者）
       - change_reason（変更理由）
       業務的意義:
       - 監査証跡
       - トラブルシューティング
       - SAP連携エラーの追跡

    10. 後方互換性エイリアス（L262）
        理由: v2.x からの移行を円滑にする
        設計:
        - AllocationRepository = ReservationRepository
        → 既存コードが動作し続ける
        将来的な削除計画:
        - v3.1: 非推奨警告を追加
        - v4.0: エイリアスを削除
    """

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
            .options(joinedload(LotReservation.lot))  # type: ignore[attr-defined]
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
