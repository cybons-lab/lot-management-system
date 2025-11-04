# backend/app/models/logs.py
"""
連携・ログ関連のモデル定義
入庫取込ログ（汎用化）、SAP連携ログ
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from .base_model import AuditMixin, Base


class InboundSubmission(AuditMixin, Base):
    """受入取込ログ（OCR等の汎用チャネル）。"""

    __tablename__ = "inbound_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Text, unique=True)
    source_file = Column(Text)
    source = Column(String(20), nullable=False, default="ocr")  # ocr, edi, api, etc.
    operator = Column(Text)
    schema_version = Column(Text)
    target_type = Column(Text, default='order')  # order, receipt, etc.
    submission_date = Column(DateTime, default=func.now())
    status = Column(Text)  # success, partial, failed
    total_records = Column(Integer)
    processed_records = Column(Integer)
    failed_records = Column(Integer)
    skipped_records = Column(Integer)
    error_details = Column(Text)


class SapSyncLog(AuditMixin, Base):
    """SAP連携ログ"""
    __tablename__ = "sap_sync_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    payload = Column(Text)  # 送信データ(JSON)
    result = Column(Text)  # 受信データ(JSON)
    status = Column(Text)  # success, timeout, error
    executed_at = Column(DateTime, default=func.now())
    
    # リレーション
    order = relationship("Order", back_populates="sap_sync_logs")


# 後方互換用エイリアス（フェーズ2での削除を想定）
OcrSubmission = InboundSubmission
