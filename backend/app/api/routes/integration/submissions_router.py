"""Submissions API (Phase 3-5: v2.2.1) - Generic data intake endpoint."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.integration_schema import SubmissionRequest, SubmissionResponse
from app.services.integration import process_external_submission


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse)
def create_submission(submission: SubmissionRequest, db: Session = Depends(get_db)):
    """
    汎用サブミッション登録（v2.2.1準拠）.

    外部から取り込まれる入荷情報・受注情報などの受付口として、
    用途に依存しない汎用的な submissions リソースとして統合。

    Args:
        submission: サブミッションリクエスト
        db: データベースセッション

    Returns:
        SubmissionResponse: 取込結果

    Note:
        - source: "ocr", "excel", "api" など
        - payload: 任意のデータ構造（sourceに応じて処理を分岐）

    Raises:
        HTTPException: 未対応のソース種別の場合
        ValueError: payload のパース失敗時（サービス層からスロー）
    """
    # Validate source type
    supported_sources = ["ocr", "excel", "api"]
    if submission.source.lower() not in supported_sources:
        raise HTTPException(
            status_code=400,
            detail=f"未対応のソース種別: {submission.source}。対応: {', '.join(supported_sources)}",
        )

    # Check for unimplemented sources
    if submission.source.lower() in ["excel", "api"]:
        raise HTTPException(
            status_code=501,
            detail=f"{submission.source.upper()}取込は未実装です。OCRソースを使用してください。",
        )

    # Delegate to unified submission service
    try:
        return process_external_submission(db, submission)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
