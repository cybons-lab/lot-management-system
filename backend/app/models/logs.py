# backend/app/models/logs.py
"""
連携・ログ関連のモデル定義

外部システムとの連携履歴を記録。

- InboundSubmission: 受入取込ログ（OCR/EDI/API等の汎用チャネル）
- SapSyncLog: SAP連携ログ
- OcrSubmission: InboundSubmissionの後方互換エイリアス（非推奨）
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, relationship
from .base_model import AuditMixin, Base


class InboundSubmission(AuditMixin, Base):
    """
    受入取込ログ（OCR等の汎用チャネル）
    
    外部から受け取ったデータの取込履歴を記録。
    OCR、EDI、API等の複数チャネルに対応。
    
    Attributes:
        id: 内部ID（主キー）
        submission_id: 取込ID（ユニーク）
        source_file: 元ファイルパス
        source: データソース（ocr, edi, api等）
        operator: 操作者
        schema_version: スキーマバージョン
        target_type: 対象種別（order, receipt等）
        submission_date: 取込日時
        status: ステータス（success, partial, failed）
        total_records: 総レコード数
        processed_records: 処理済レコード数
        failed_records: 失敗レコード数
        skipped_records: スキップレコード数
        error_details: エラー詳細
    """

    __tablename__ = "inbound_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    submission_id = Column(Text, unique=True)  # 取込ID
    source_file = Column(Text)  # 元ファイルパス
    source = Column(String(20), nullable=False, default="ocr")  # データソース
    operator = Column(Text)  # 操作者
    schema_version = Column(Text)  # スキーマバージョン
    target_type = Column(Text, default='order')  # 対象種別
    submission_date = Column(DateTime, default=func.now())  # 取込日時
    status = Column(Text)  # ステータス
    total_records = Column(Integer)  # 総レコード数
    processed_records = Column(Integer)  # 処理済レコード数
    failed_records = Column(Integer)  # 失敗レコード数
    skipped_records = Column(Integer)  # スキップレコード数
    error_details = Column(Text)  # エラー詳細


class SapSyncLog(AuditMixin, Base):
    """
    SAP連携ログ
    
    SAPシステムへのデータ送信履歴を記録。
    
    Attributes:
        id: 内部ID（主キー）
        order_id: 受注ID（FK）
        payload: 送信データ（JSON形式）
        result: 受信データ（JSON形式）
        status: ステータス（success, timeout, error）
        executed_at: 実行日時
    """
    __tablename__ = "sap_sync_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # 内部ID
    order_id = Column(Integer, ForeignKey("orders.id"))  # 受注ID
    payload = Column(Text)  # 送信データ（JSON）
    result = Column(Text)  # 受信データ（JSON）
    status = Column(Text)  # ステータス
    executed_at = Column(DateTime, default=func.now())  # 実行日時
    
    # リレーション
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="sap_sync_logs",
        lazy="noload",  # 受注情報は必要時のみ明示的に取得
    )


# 後方互換用エイリアス（フェーズ2での削除を想定）
OcrSubmission = InboundSubmission
