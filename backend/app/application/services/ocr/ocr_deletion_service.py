"""OCR結果削除サービス."""

from fastapi import HTTPException
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
        for ocr_id in ids:
            # 1. OCR結果を取得
            ocr_result = db.query(SmartReadLongData).filter(SmartReadLongData.id == ocr_id).first()

            if not ocr_result:
                logger.warning(
                    "OCR result not found for deletion",
                    extra={"ocr_id": ocr_id, "user_id": user_id},
                )
                raise HTTPException(status_code=404, detail=f"OCR結果が見つかりません: ID={ocr_id}")

            # 2. 編集データを取得してエラーフラグをチェック
            edit = (
                db.query(OcrResultEdit)
                .filter(OcrResultEdit.smartread_long_data_id == ocr_id)
                .first()
            )

            has_error = False
            if edit and edit.error_flags:
                has_error = any(edit.error_flags.values())

            # 3. エラーがない場合はスキップ
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

            # 4. 削除実行（カスケード）
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
