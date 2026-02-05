"""SmartRead OCR models for PDF import configuration."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base_model import Base


class SmartReadConfig(Base):
    """SmartRead OCRの設定を保存.

    API接続情報やテンプレート設定を管理する。
    """

    __tablename__ = "smartread_configs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # API接続設定
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    api_key: Mapped[str] = mapped_column(Text, nullable=False)

    # リクエスト設定
    template_ids: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # カンマ区切りでテンプレートID

    # エクスポート設定
    export_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="json"
    )  # json or csv
    aggregation_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 集約タイプ

    # ディレクトリ設定（オプション：ファイル監視用）
    watch_dir: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_dir: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_exts: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="pdf,png,jpg,jpeg"
    )  # 対応拡張子

    # メタ情報
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="default")  # 設定名
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_default: Mapped[bool] = mapped_column(default=False, server_default=text("false"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class SmartReadTask(Base):
    """SmartRead タスク管理テーブル.

    日次タスクの管理を行う。
    """

    __tablename__ = "smartread_tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    skip_today: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    data_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class SmartReadWideData(Base):
    """SmartRead 横持ちデータ（生データ）.

    exportから取得したCSV行を保存する。
    """

    __tablename__ = "smartread_wide_data"
    __table_args__ = (
        UniqueConstraint(
            "config_id", "task_date", "row_fingerprint", name="uq_wide_data_fingerprint"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    export_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # exportルート用
    request_id_ref: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("smartread_requests.id", ondelete="SET NULL"), nullable=True
    )  # requestId/resultsルート用
    filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    row_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class RpaJob(Base):
    """RPAジョブ管理テーブル.

    RPAによるSAP連携などのジョブ状態を管理する。
    """

    __tablename__ = "rpa_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # sales_order_entry etc
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending, validating, processing, completed, failed

    # メタデータ
    target_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    timeout_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SmartReadLongData(Base):
    """SmartRead 縦持ちデータ（変換後）.

    横持ちデータから変換された縦持ちデータを保存する。
    """

    __tablename__ = "smartread_long_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wide_data_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("smartread_wide_data.id", ondelete="CASCADE"), nullable=True
    )
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    request_id_ref: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("smartread_requests.id", ondelete="SET NULL"), nullable=True
    )  # requestId/resultsルート用
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING", server_default=text("'PENDING'")
    )  # PENDING / IMPORTED / ERROR / PROCESSING
    error_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # RPA Linkage
    rpa_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rpa_jobs.id", ondelete="SET NULL"), nullable=True
    )
    sap_order_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    verification_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class SmartReadLongDataCompleted(Base):
    """SmartRead 縦持ちデータ（完了済みアーカイブ）.

    完了処理されたデータを保存する。
    元のFK制約は持たず、削除後もデータを保持する。
    """

    __tablename__ = "smartread_long_data_completed"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True
    )  # Keep original ID if possible, or new
    original_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # Traceability

    # Copy of essential fields without FKs
    wide_data_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    config_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    task_id: Mapped[str] = mapped_column(String(255), nullable=False)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    request_id_ref: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="COMPLETED")

    # RPA Linkage Snapshot
    sap_order_no: Mapped[str | None] = mapped_column(String(50), nullable=True)

    completed_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)  # Original creation time


class SmartReadRequest(Base):
    """SmartRead リクエスト管理テーブル.

    requestId/resultsルートで全自動化するためのリクエスト追跡用。
    """

    __tablename__ = "smartread_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    # タスクへの参照
    task_id_ref: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("smartread_tasks.id", ondelete="CASCADE"), nullable=True
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False)  # SmartRead API側のtaskId
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )

    # ファイル情報
    filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    num_of_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 状態管理
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(50), nullable=False, default="PENDING", server_default=text("'PENDING'")
    )
    # state: PENDING / OCR_RUNNING / OCR_COMPLETED / OCR_FAILED / OCR_VERIFICATION_COMPLETED /
    #        SORTING_RUNNING / SORTING_COMPLETED / SORTING_FAILED / SORTING_DROPPED / TIMEOUT

    # 結果
    result_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class SmartReadExportHistory(Base):
    """SmartRead エクスポート履歴.

    エクスポート処理の実行履歴を記録する。
    request_id調査用のトレーサビリティを確保。
    """

    __tablename__ = "smartread_export_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[str] = mapped_column(String(255), nullable=False)
    export_id: Mapped[str] = mapped_column(String(255), nullable=False)
    task_date: Mapped[date] = mapped_column(Date, nullable=False)
    filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    wide_row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    long_row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="SUCCESS"
    )  # SUCCESS / FAILED
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class SmartReadPadRun(Base):
    """PAD互換フローの実行記録（工程追跡用）.

    PADスクリプトと同じ手順（task→request→poll→export→download→CSV後処理）を
    サーバ側で実行し、各工程の状態をDBに記録する。

    heartbeat_at でバックグラウンド処理の生存を確認し、
    一定時間更新がなければ STALE として検出する。

    See: docs/smartread/pad_runner_implementation_plan.md
    """

    __tablename__ = "smartread_pad_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    config_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("smartread_configs.id", ondelete="CASCADE"), nullable=False
    )

    # 状態管理
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="RUNNING", server_default=text("'RUNNING'")
    )  # RUNNING / SUCCEEDED / FAILED / STALE

    step: Mapped[str] = mapped_column(
        String(30), nullable=False, default="CREATED", server_default=text("'CREATED'")
    )
    # step: CREATED / TASK_CREATED / UPLOADED / REQUEST_DONE / TASK_DONE /
    #       EXPORT_STARTED / EXPORT_DONE / DOWNLOADED / POSTPROCESSED

    # SmartRead API のID
    task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    export_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # 入力情報（監視フォルダ内のファイル名リスト）
    filenames: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    # 結果
    wide_data_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    long_data_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    heartbeat_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # リトライ管理
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)


class OcrResultEdit(Base):
    """OCR結果の手入力編集内容を保存."""

    __tablename__ = "ocr_result_edits"
    __table_args__ = (
        UniqueConstraint("smartread_long_data_id", name="uq_ocr_result_edits_long_data_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    smartread_long_data_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("smartread_long_data.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_no_1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_1: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lot_no_2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_2: Mapped[str | None] = mapped_column(String(50), nullable=True)
    inbound_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inbound_no_2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    shipping_slip_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipping_slip_text_edited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    jiku_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    material_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_quantity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_date: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 処理ステータス: pending/downloaded/sap_linked/completed
    process_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default=text("'pending'")
    )
    # バリデーションエラーフラグ: {"master_not_found": true, ...}
    error_flags: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'")
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


class OcrResultEditCompleted(Base):
    """OCR結果の手入力編集内容（完了済みアーカイブ）.

    完了処理されたデータの編集内容を保存する。
    """

    __tablename__ = "ocr_result_edits_completed"

    # Needs a link to the completed long data
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # ID from original or new
    original_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    smartread_long_data_completed_id: Mapped[int] = mapped_column(
        BigInteger,
        # No FK to allow deletion of history if needed, or maintain consistency manually.
        # Actually usually history tables don't enforce FKs to avoid locking issues.
        nullable=False,
    )

    lot_no_1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_1: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lot_no_2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_2: Mapped[str | None] = mapped_column(String(50), nullable=True)
    inbound_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inbound_no_2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    shipping_slip_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipping_slip_text_edited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    jiku_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    material_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_quantity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_date: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # SAP Snapshot Data
    sap_match_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sap_matched_zkdmat_b: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sap_supplier_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sap_supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sap_qty_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sap_maker_item: Mapped[str | None] = mapped_column(String(100), nullable=True)

    process_status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    error_flags: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    completed_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
