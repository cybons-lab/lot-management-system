"""SAP Integration router.

Includes:
- Sales order registration (mock)
- Material download and caching
- OCR-SAP-Master reconciliation
"""

import logging
import random
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.services.sap import SapMaterialService, SapReconciliationService
from app.core.database import get_db
from app.infrastructure.persistence.models.sap_models import (
    SapConnection,
    SapFetchLog,
)
from app.presentation.schemas.integration.sap_schema import (
    SapConnectionCreateRequest,
    SapConnectionResponse,
    SapFetchLogResponse,
    SapMaterialCacheResponse,
    SapMaterialFetchRequest,
    SapMaterialFetchResponse,
    SAPOrderRegistrationRequest,
    SAPOrderRegistrationResponse,
    SAPOrderRegistrationResult,
    SapReconcileRequest,
    SapReconcileResultResponse,
    SapReconcileSummaryResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration/sap", tags=["integration"])


@router.post("/sales-orders", response_model=SAPOrderRegistrationResponse)
async def register_sales_orders(
    request: SAPOrderRegistrationRequest,
) -> SAPOrderRegistrationResponse:
    """受注をSAPに登録（モック実装）.

    SAPシステムへの受注登録をシミュレートします。
    提供された受注IDに対してダミーのSAP受注番号を返します。

    Args:
        request: SAP受注登録リクエスト（受注IDリスト）

    Returns:
        SAPOrderRegistrationResponse: 登録結果（受注ID、SAP受注番号、ステータス）

    Note:
        現在はモック実装です。本番環境では実際のSAP APIに接続します。
        1秒のネットワーク遅延をシミュレートしています。
    """
    # Simulate network latency
    time.sleep(1)

    results = []
    for order_id in request.order_ids:
        # Generate dummy SAP Order No (e.g., SAP-000123)
        dummy_sap_no = f"SAP-{random.randint(100000, 999999)}"

        results.append(
            SAPOrderRegistrationResult(
                order_id=order_id,
                sap_order_no=dummy_sap_no,
                status="registered",
            )
        )

    return SAPOrderRegistrationResponse(
        status="success",
        registered_count=len(results),
        results=results,
    )


# ============================================================
# SAP Connection Management
# ============================================================


@router.get("/connections", response_model=list[SapConnectionResponse])
async def list_connections(
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = Query(True, description="アクティブな接続のみ"),
) -> list[SapConnectionResponse]:
    """SAP接続情報一覧を取得."""
    from sqlalchemy import select

    stmt = select(SapConnection)
    if active_only:
        stmt = stmt.where(SapConnection.is_active == True)  # noqa: E712
    stmt = stmt.order_by(SapConnection.id)

    connections = list(db.execute(stmt).scalars().all())
    return [SapConnectionResponse.model_validate(c) for c in connections]


@router.post("/connections", response_model=SapConnectionResponse)
async def create_connection(
    request: SapConnectionCreateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> SapConnectionResponse:
    """SAP接続情報を作成.

    Note:
        パスワードは暗号化して保存されます。
        現在の実装では簡易的なBase64エンコードを使用しています。
        本番環境では適切な暗号化方式に置き換えてください。
    """
    import base64

    # 簡易暗号化（本番では適切な暗号化に置き換え）
    passwd_encrypted = base64.b64encode(request.passwd.encode()).decode()

    # is_default=Trueの場合、他の接続のis_defaultをFalseに
    if request.is_default:
        from sqlalchemy import update

        db.execute(update(SapConnection).values(is_default=False))

    connection = SapConnection(
        name=request.name,
        environment=request.environment,
        description=request.description,
        ashost=request.ashost,
        sysnr=request.sysnr,
        client=request.client,
        user_name=request.user_name,
        passwd_encrypted=passwd_encrypted,
        lang=request.lang,
        default_bukrs=request.default_bukrs,
        default_kunnr=request.default_kunnr,
        is_default=request.is_default,
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)

    logger.info(f"[SAP] Created connection: id={connection.id}, name={connection.name}")

    return SapConnectionResponse.model_validate(connection)


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """SAP接続情報を削除（論理削除）."""
    connection = db.get(SapConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="接続情報が見つかりません")

    connection.is_active = False
    db.commit()

    logger.info(f"[SAP] Deactivated connection: id={connection_id}")

    return {"status": "success", "message": f"接続ID {connection_id} を無効化しました"}


# ============================================================
# SAP Material Download & Cache
# ============================================================


@router.post("/materials/fetch", response_model=SapMaterialFetchResponse)
async def fetch_materials(
    request: SapMaterialFetchRequest,
    db: Annotated[Session, Depends(get_db)],
) -> SapMaterialFetchResponse:
    """SAPからマテリアルデータを取得してキャッシュに保存.

    Z_SCM1_RFC_MATERIAL_DOWNLOADを呼び出し、ET_DATAをキャッシュテーブルに保存します。

    Note:
        - パスワードが未設定の場合はモックデータを返します
        - 本番環境では適切なパスワード復号化が必要です
    """
    service = SapMaterialService(db)

    # TODO: 本番では接続情報からパスワードを復号化
    # 現在はモックモードで動作
    result = service.fetch_and_cache_materials(
        connection_id=request.connection_id,
        kunnr_f=request.kunnr_f,
        kunnr_t=request.kunnr_t,
        bukrs=request.bukrs,
        zaiko=request.zaiko,
        limit=request.limit,
        decrypted_passwd=None,  # モックモード
    )

    return SapMaterialFetchResponse(
        success=result.success,
        fetch_batch_id=result.fetch_batch_id,
        record_count=result.record_count,
        cached_count=result.cached_count,
        error_message=result.error_message,
        duration_ms=result.duration_ms,
    )


@router.get("/materials/cache", response_model=list[SapMaterialCacheResponse])
async def list_cached_materials(
    db: Annotated[Session, Depends(get_db)],
    connection_id: int | None = Query(None, description="接続ID"),
    kunnr: str | None = Query(None, description="得意先コード"),
    limit: int = Query(100, description="取得件数上限"),
) -> list[SapMaterialCacheResponse]:
    """キャッシュされたマテリアルデータを取得."""
    service = SapMaterialService(db)
    cache_list = service.get_cached_materials(connection_id, kunnr)

    return [SapMaterialCacheResponse.model_validate(item) for item in cache_list[:limit]]


@router.delete("/materials/cache")
async def clear_cache(
    db: Annotated[Session, Depends(get_db)],
    connection_id: int | None = Query(None, description="接続ID"),
    kunnr: str | None = Query(None, description="得意先コード"),
) -> dict[str, str | int]:
    """キャッシュをクリア."""
    service = SapMaterialService(db)
    deleted_count = service.clear_cache(connection_id, kunnr)

    logger.info(f"[SAP] Cleared {deleted_count} cache entries")

    return {"status": "success", "deleted_count": deleted_count}


# ============================================================
# SAP-Master Reconciliation
# ============================================================


@router.post("/reconcile", response_model=SapReconcileSummaryResponse)
async def reconcile_ocr_results(
    request: SapReconcileRequest,
    db: Annotated[Session, Depends(get_db)],
) -> SapReconcileSummaryResponse:
    """OCR結果をSAP・マスタと突合.

    突合ロジック:
    1. SAP突合（完全一致 → 前方一致）
    2. マスタ突合
    3. 総合ステータス判定（OK/WARNING/ERROR）

    Note:
        キャッシュがない場合は自動的にSAPから再取得を試みます。
    """
    service = SapReconciliationService(db)
    summary = service.reconcile_ocr_results(
        task_date=request.task_date,
        config_id=request.config_id,
        customer_code=request.customer_code,
    )

    return SapReconcileSummaryResponse(
        total_count=summary.total_count,
        ok_count=summary.ok_count,
        warning_count=summary.warning_count,
        error_count=summary.error_count,
        sap_exact_count=summary.sap_exact_count,
        sap_prefix_count=summary.sap_prefix_count,
        sap_not_found_count=summary.sap_not_found_count,
        master_matched_count=summary.master_matched_count,
        master_not_found_count=summary.master_not_found_count,
        results=[
            SapReconcileResultResponse(
                material_code=r.material_code,
                jiku_code=r.jiku_code,
                customer_code=r.customer_code,
                sap_match_type=r.sap_match_type.value,
                sap_matched_zkdmat_b=r.sap_matched_zkdmat_b,
                sap_raw_data=r.sap_raw_data,
                master_match_type=r.master_match_type.value,
                master_id=r.master_id,
                master_customer_part_no=r.master_customer_part_no,
                overall_status=r.overall_status.value,
                messages=r.messages,
            )
            for r in summary.results
        ],
    )


@router.post("/reconcile/single", response_model=SapReconcileResultResponse)
async def reconcile_single(
    db: Annotated[Session, Depends(get_db)],
    material_code: str = Query(..., description="材質コード"),
    jiku_code: str | None = Query(None, description="次区"),
    customer_code: str = Query("100427105", description="得意先コード"),
) -> SapReconcileResultResponse:
    """1件を突合.

    デバッグ・テスト用のエンドポイント。
    """
    service = SapReconciliationService(db)
    service.load_sap_cache(customer_code)

    result = service.reconcile_single(material_code, jiku_code, customer_code)

    return SapReconcileResultResponse(
        material_code=result.material_code,
        jiku_code=result.jiku_code,
        customer_code=result.customer_code,
        sap_match_type=result.sap_match_type.value,
        sap_matched_zkdmat_b=result.sap_matched_zkdmat_b,
        sap_raw_data=result.sap_raw_data,
        master_match_type=result.master_match_type.value,
        master_id=result.master_id,
        master_customer_part_no=result.master_customer_part_no,
        overall_status=result.overall_status.value,
        messages=result.messages,
    )


# ============================================================
# SAP Fetch Logs
# ============================================================


@router.get("/logs", response_model=list[SapFetchLogResponse])
async def list_fetch_logs(
    db: Annotated[Session, Depends(get_db)],
    connection_id: int | None = Query(None, description="接続ID"),
    limit: int = Query(50, description="取得件数上限"),
) -> list[SapFetchLogResponse]:
    """SAP取得ログ一覧を取得."""
    from sqlalchemy import select

    stmt = select(SapFetchLog)
    if connection_id:
        stmt = stmt.where(SapFetchLog.connection_id == connection_id)
    stmt = stmt.order_by(SapFetchLog.created_at.desc()).limit(limit)

    logs = list(db.execute(stmt).scalars().all())
    return [SapFetchLogResponse.model_validate(log) for log in logs]
