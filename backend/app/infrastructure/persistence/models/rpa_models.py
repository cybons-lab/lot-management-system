"""RPA Run models for Material Delivery Note workflow.

【設計意図】RPAワークフローモデルの設計判断:

1. なぜ RpaRun（親）と RpaRunItem（子）に分けるのか
   理由: ワークフロー全体と個別明細を分離管理
   業務的背景:
   - 素材納品書発行ワークフロー: 1回のCSV取込で複数の納品書を発行
   - 例: 100行のCSVから100件の納品書を一括処理
   → 全体のステータス（RpaRun）と個別明細の進捗（RpaRunItem）を分離
   実装:
   - RpaRun: ワークフロー全体の管理（開始日時、実行者、ステータス）
   - RpaRunItem: 個別明細の管理（発行フラグ、完了フラグ、突合結果）
   → 1対多の関係

2. なぜ複雑なステータスフローがあるのか（L18-54）
   理由: 4ステップのワークフローを厳密に管理
   ワークフロー:
   - Step1（CSV取込）: step1_done
   - Step2（確認）: step2_confirmed
   - Step3（PAD実行）: step3_running → step3_done
   - Step4（突合チェック）: step4_checking → step4_review → done
   業務要件:
   - 各ステップの完了を確認してから次へ進む
   → ステータスで現在位置を追跡
   実装:
   - legacy aliases（L45-53）: 後方互換性のためのエイリアス

3. なぜ started_by_user_id など複数のユーザーIDがあるのか（L76-86）
   理由: 各ステップの実行者を記録
   監査要件:
   - Step1実行者: started_by_user_id
   - Step2実行者: step2_executed_by_user_id
   - Step4実行者: external_done_by_user_id
   → 「誰が、いつ、どのステップを実行したか」を記録
   用途:
   - 問題発生時の責任追跡
   - 作業履歴の可視化

4. なぜ CASCADE="all, delete-orphan" を使うのか（L115）
   理由: Run削除時に全明細も削除
   背景:
   - RpaRun 削除時に、RpaRunItem も削除すべき
   → 明細だけが残ると、データ不整合
   実装:
   - cascade="all, delete-orphan"
   → RpaRun を削除すると、関連する RpaRunItem も自動削除
   業務影響:
   - ワークフロー全体のキャンセル時に、明細も一括削除

5. なぜ order_by="RpaRunItem.row_no" があるのか（L116）
   理由: CSV行番号順での表示
   背景:
   - CSVの行番号（row_no）順に処理を表示したい
   → フロントエンドでの表示順序を保証
   実装:
   - order_by="RpaRunItem.row_no"
   → relationship で自動的にソート
   業務影響:
   - CSVの元の順序で明細が表示される

6. なぜ property で集計メソッドを定義するのか（L126-146）
   理由: ワークフローの進捗状況を簡単に取得
   メソッド:
   - all_items_complete: 全明細が完了しているか
   - item_count: 明細数
   - complete_count: 完了済み明細数
   - issue_count: 発行対象明細数
   用途:
   - フロントエンドでの進捗表示: 「100件中80件完了」
   - ステータス遷移の判定: 全明細完了 → done

7. なぜ complement_customer_id などのカラムがあるのか（L199-207）
   理由: OCR→SAP変換時のマスタ参照ログ
   業務的背景:
   - OCR で読み取った品番コードをマスタで検索
   - 例: 品番 "P-001" → customer_items テーブルで検索
   → どのマスタレコードを参照したかを記録
   実装:
   - complement_customer_id: 参照したマスタの customer_id
   - complement_external_product_code: 参照したマスタの external_product_code
   - complement_match_type: 検索種別（exact: 完全一致, prefix: 前方一致）
   用途:
   - マスタ検索の監査証跡
   - 誤変換時のデバッグ

8. なぜ result_status と processing_started_at があるのか（L193-196）
   理由: 非同期処理のタイムアウト検出
   業務的背景:
   - PAD（Power Automate Desktop）は外部プロセス
   → 処理が止まる可能性がある
   実装:
   - result_status: pending/success/failure/error
   - processing_started_at: 処理開始日時
   用途:
   - タイムアウト検出: 開始から30分経過 → タイムアウト
   → ステータスを error に更新

9. なぜ lock_flag があるのか（L186-188）
   理由: Step3開始後の明細編集を防止
   業務ルール:
   - Step3（PAD実行）開始後は、明細を編集不可
   → PAD処理中にデータが変わると不整合
   実装:
   - lock_flag: Step3開始時に TRUE に設定
   → フロントエンドで編集フォームを無効化
   業務影響:
   - 処理中の誤編集を防止

10. なぜ sap_registered と match_result があるのか（L183-184）
    理由: SAP連携と突合チェックの結果を記録
    業務フロー:
    - Step3: PAD で納品書PDF生成 → SAP登録
    - Step4: 突合チェック（予定 vs 実績）
    実装:
    - sap_registered: SAP登録済みフラグ
    - match_result: 突合結果（True: 一致, False: 不一致）
    用途:
    - Step4でのレビュー: 突合結果が False の明細を確認
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.auth_models import User


class RpaRunStatus:
    """RPA Run status constants.

    ステータスフロー:
    step1_done → step2_confirmed → step3_running → step3_done
    → step4_checking → step4_review → done
    """

    # Step1完了（CSVインポート直後）
    STEP1_DONE = "step1_done"
    # Step2確認完了（Step3実行可能）
    STEP2_CONFIRMED = "step2_confirmed"
    # Step3（PAD）実行中
    STEP3_RUNNING = "step3_running"
    # Step3完了・外部手順待ち
    STEP3_DONE = "step3_done"
    # Step4突合チェック中
    STEP4_CHECKING = "step4_checking"
    # Step4 NG再実行中
    STEP4_NG_RETRY = "step4_ng_retry"
    # Step4レビュー可能
    STEP4_REVIEW = "step4_review"
    # 完了
    DONE = "done"
    # キャンセル
    CANCELLED = "cancelled"

    # Legacy aliases for backward compatibility
    DOWNLOADED = "step1_done"
    DRAFT = "step1_done"
    READY_FOR_STEP2 = "step2_confirmed"
    STEP2_RUNNING = "step3_running"
    STEP3_DONE_WAITING_EXTERNAL = "step3_done"
    READY_FOR_STEP4_CHECK = "step4_checking"
    STEP4_CHECK_RUNNING = "step4_checking"
    READY_FOR_STEP4_REVIEW = "step4_review"


class RpaRun(Base):
    """RPA実行記録（親テーブル）.

    素材納品書発行ワークフローの実行単位を管理。
    1回のCSV取込が1つのRunに対応。
    """

    __tablename__ = "rpa_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rpa_type: Mapped[str] = mapped_column(
        String(50), server_default="material_delivery_note", nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), server_default="downloaded", nullable=False)

    # 取得データの期間
    data_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    step2_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    step2_executed_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Step4 / External Done
    external_done_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    external_done_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    step4_executed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # Step4チェック開始日時

    # 得意先（CSVインポート時に設定）
    customer_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (
        Index("idx_rpa_runs_type", "rpa_type"),
        Index("idx_rpa_runs_status", "status"),
        Index("idx_rpa_runs_created_at", "created_at"),
        Index("idx_rpa_runs_customer_id", "customer_id"),
    )

    # Relationships
    items: Mapped[list[RpaRunItem]] = relationship(
        "RpaRunItem",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="RpaRunItem.row_no",
    )
    started_by_user: Mapped[User | None] = relationship("User", foreign_keys=[started_by_user_id])
    step2_executed_by_user: Mapped[User | None] = relationship(
        "User", foreign_keys=[step2_executed_by_user_id]
    )
    external_done_by_user: Mapped[User | None] = relationship(
        "User", foreign_keys=[external_done_by_user_id]
    )

    @property
    def all_items_complete(self) -> bool:
        """全itemsが完了しているかどうか."""
        if not self.items:
            return False
        return all(item.complete_flag for item in self.items)

    @property
    def item_count(self) -> int:
        """items数."""
        return len(self.items) if self.items else 0

    @property
    def complete_count(self) -> int:
        """完了済みitems数."""
        return sum(1 for item in self.items if item.complete_flag) if self.items else 0

    @property
    def issue_count(self) -> int:
        """発行対象items数."""
        return sum(1 for item in self.items if item.issue_flag) if self.items else 0


class RpaRunItem(Base):
    """RPA実行明細（子テーブル）.

    CSVの各行に対応するデータを保持。
    """

    __tablename__ = "rpa_run_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("rpa_runs.id", ondelete="CASCADE"), nullable=False
    )
    row_no: Mapped[int] = mapped_column(Integer, nullable=False)

    # CSV columns (field names aligned with main DB)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ステータス
    jiku_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # 次区コード（表示名: 出荷先）
    layer_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 層別
    external_product_code: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # 先方品番（表示名: 材質コード）
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # 納期
    delivery_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 納入量
    shipping_vehicle: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 出荷便

    # Flags
    issue_flag: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )  # 発行フラグ
    complete_flag: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )  # 発行完了フラグ
    match_result: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # 突合結果
    sap_registered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # SAP登録
    order_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 受発注No
    lock_flag: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )  # 編集ロック（Step3開始時にON）
    item_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # アイテムNo
    lot_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ロットNo（Step4入力）

    # 結果ステータス (pending/success/failure/error)
    result_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # 処理開始日時（タイムアウト回収用）
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result_pdf_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_screenshot_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # === OCR→SAP変換マスタ参照ログ ===
    complement_customer_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, comment="参照したマスタのcustomer_id"
    )
    complement_external_product_code: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="参照したマスタのexternal_product_code"
    )
    complement_match_type: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="検索種別（exact: 完全一致, prefix: 前方一致）"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (
        Index("idx_rpa_run_items_run_id", "run_id"),
        Index("idx_rpa_run_items_run_row", "run_id", "row_no", unique=True),
        Index(
            "idx_rri_complement_master",
            "complement_customer_id",
            "complement_external_product_code",
        ),
        Index("idx_rpa_run_items_locked_until", "locked_until"),
    )

    # Relationships
    run: Mapped[RpaRun] = relationship("RpaRun", back_populates="items")
