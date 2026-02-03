"""OCR結果削除サービス."""

from fastapi import HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    SmartReadLongData,
)
from app.presentation.schemas.ocr_import_schema import SmartReadDeletionResponse


logger = get_logger(__name__)


def delete_ocr_results_service(
    db: Session, ids: list[int], user_id: int
) -> SmartReadDeletionResponse:
    """
    エラーのあるOCR結果を削除する（トランザクション管理）.

    Args:
        db: データベースセッション
        ids: 削除対象IDリスト
        user_id: 削除実行ユーザーID

    Returns:
        SmartReadDeletionResponse: 削除結果

    Raises:
        HTTPException 404: 指定IDが存在しない

    """
    deleted_count = 0
    skipped_count = 0
    skipped_ids = []

    try:
        # 対象OCR結果をまとめて取得（存在チェック）
        ocr_results = db.query(SmartReadLongData).filter(SmartReadLongData.id.in_(ids)).all()
        ocr_result_map = {item.id: item for item in ocr_results}
        missing_ids = [ocr_id for ocr_id in ids if ocr_id not in ocr_result_map]
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail=f"OCR結果が見つかりません: ID={missing_ids[0]}",
            )

        # v_ocr_resultsのhas_errorで削除可否を判定
        stmt = text("SELECT id, has_error FROM v_ocr_results WHERE id IN :ids").bindparams(
            bindparam("ids", expanding=True)
        )
        has_error_rows = db.execute(stmt, {"ids": ids}).mappings().all()
        has_error_map = {row["id"]: row["has_error"] for row in has_error_rows}
        missing_in_view = [ocr_id for ocr_id in ids if ocr_id not in has_error_map]
        if missing_in_view:
            raise HTTPException(
                status_code=404,
                detail=f"OCR結果が見つかりません: ID={missing_in_view[0]}",
            )

        for ocr_id in ids:
            ocr_result = ocr_result_map[ocr_id]
            has_error = bool(has_error_map.get(ocr_id))

            # エラーがない場合はスキップ
            if not has_error:
                logger.info(
                    "OCR result skipped (no error)",
                    extra={
                        "ocr_id": ocr_id,
                        "task_id": ocr_result.task_id,
                        "user_id": user_id,
                    },
                )
                skipped_count += 1
                skipped_ids.append(ocr_id)
                continue

            # 編集データを取得して削除
            edit = (
                db.query(OcrResultEdit)
                .filter(OcrResultEdit.smartread_long_data_id == ocr_id)
                .first()
            )

            # 削除実行（カスケード）
            if edit:
                db.delete(edit)
                logger.info(
                    "OCR edit deleted",
                    extra={
                        "ocr_id": ocr_id,
                        "task_id": ocr_result.task_id,
                        "error_flags": edit.error_flags,
                        "user_id": user_id,
                    },
                )

            db.delete(ocr_result)
            logger.info(
                "OCR result deleted",
                extra={
                    "ocr_id": ocr_id,
                    "task_id": ocr_result.task_id,
                    "user_id": user_id,
                },
            )

            deleted_count += 1

        # 5. コミット
        db.commit()

        logger.info(
            "OCR deletion completed",
            extra={
                "deleted_count": deleted_count,
                "skipped_count": skipped_count,
                "user_id": user_id,
            },
        )

        return SmartReadDeletionResponse(
            deleted_count=deleted_count,
            skipped_count=skipped_count,
            skipped_ids=skipped_ids,
            message=(
                f"{skipped_count}件の項目にエラーがないため削除がスキップされました。"
                if skipped_count > 0
                else None
            ),
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception(
            "OCR deletion failed",
            extra={"ids": ids, "user_id": user_id, "error": str(exc)[:500]},
        )
        raise HTTPException(status_code=500, detail="OCR結果の削除に失敗しました")
