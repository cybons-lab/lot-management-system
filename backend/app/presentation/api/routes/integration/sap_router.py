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
    SapCacheItemResponse,
    SapCacheListResponse,
    SapConnectionCreateRequest,
    SapConnectionResponse,
    SapConnectionTestResponse,
    SapConnectionUpdateRequest,
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


@router.put("/connections/{connection_id}", response_model=SapConnectionResponse)
async def update_connection(
    connection_id: int,
    request: SapConnectionUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
) -> SapConnectionResponse:
    """SAP接続情報を更新.

    Note:
        パスワードが空でない場合のみ更新されます。
    """
    import base64

    connection = db.get(SapConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="接続情報が見つかりません")

    # is_default=Trueの場合、他の接続のis_defaultをFalseに
    if request.is_default:
        from sqlalchemy import update

        db.execute(
            update(SapConnection).where(SapConnection.id != connection_id).values(is_default=False)
        )

    # 更新対象のフィールドのみ更新
    update_data = request.model_dump(exclude_unset=True)

    # パスワードは特別処理（空でない場合のみ更新）
    if "passwd" in update_data:
        passwd = update_data.pop("passwd")
        if passwd:
            connection.passwd_encrypted = base64.b64encode(passwd.encode()).decode()

    for key, value in update_data.items():
        setattr(connection, key, value)

    db.commit()
    db.refresh(connection)

    logger.info(f"[SAP] Updated connection: id={connection_id}")

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


@router.post("/connections/{connection_id}/test", response_model=SapConnectionTestResponse)
async def test_connection(
    connection_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> SapConnectionTestResponse:
    """SAP接続テストを実行.

    pyrfcを使用して実際にSAPに接続し、接続テストを行います。
    パスワードが設定されていない場合はモックモードとして成功を返します。
    """
    import base64

    start_time = time.time()
    connection = db.get(SapConnection, connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="接続情報が見つかりません")

    # パスワード復号化
    decrypted_passwd = None
    if connection.passwd_encrypted:
        try:
            decrypted_passwd = base64.b64decode(connection.passwd_encrypted).decode()
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return SapConnectionTestResponse(
                success=False,
                message=f"パスワード復号化エラー: {e}",
                duration_ms=duration_ms,
            )

    # パスワードがない場合はモックモード
    if not decrypted_passwd:
        duration_ms = int((time.time() - start_time) * 1000)
        return SapConnectionTestResponse(
            success=True,
            message="モックモード: パスワードが設定されていないため、接続テストをスキップしました",
            details={"mode": "mock"},
            duration_ms=duration_ms,
        )

    # 実際の接続テスト
    try:
        from pyrfc import Connection as PyRfcConnection

        conn_params = {
            "ashost": connection.ashost,
            "sysnr": connection.sysnr,
            "client": connection.client,
            "user": connection.user_name,
            "passwd": decrypted_passwd,
            "lang": connection.lang,
        }

        with PyRfcConnection(**conn_params) as conn:
            # RFC_PING を呼び出して接続確認
            conn.call("RFC_PING")

        duration_ms = int((time.time() - start_time) * 1000)
        return SapConnectionTestResponse(
            success=True,
            message="接続テスト成功",
            details={
                "mode": "production",
                "host": connection.ashost,
                "client": connection.client,
                "user": connection.user_name,
            },
            duration_ms=duration_ms,
        )

    except ImportError:
        duration_ms = int((time.time() - start_time) * 1000)
        return SapConnectionTestResponse(
            success=False,
            message="pyrfcがインストールされていません。nwrfcsdkのパスを確認してください。",
            details={"mode": "error", "error_type": "import_error"},
            duration_ms=duration_ms,
        )

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[SAP] Connection test failed: {e}")
        return SapConnectionTestResponse(
            success=False,
            message=f"接続テスト失敗: {e}",
            details={"mode": "production", "error_type": type(e).__name__},
            duration_ms=duration_ms,
        )


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

    動作モード:
        - DBにパスワードが設定されている場合: 本番モード（実際にSAP RFCを呼び出す）
        - パスワードが空/未設定の場合: モックモード（テストデータを返す）

    これにより、コードを変更せずにDB設定だけで本番/モック切り替えが可能。
    """
    import base64

    service = SapMaterialService(db)

    # 接続情報を取得
    if request.connection_id:
        connection = service.get_connection_by_id(request.connection_id)
    else:
        connection = service.get_default_connection()

    # パスワードを復号化（設定されていれば本番モード、なければモックモード）
    decrypted_passwd = None
    if connection and connection.passwd_encrypted:
        try:
            decrypted_passwd = base64.b64decode(connection.passwd_encrypted).decode()
            logger.info(
                f"[SAP] Using real connection: id={connection.id}, "
                f"name={connection.name}, env={connection.environment}"
            )
        except Exception as e:
            logger.warning(f"[SAP] Failed to decrypt password, falling back to mock mode: {e}")
            decrypted_passwd = None

    if not decrypted_passwd:
        logger.info("[SAP] No password configured, using mock mode")

    result = service.fetch_and_cache_materials(
        connection_id=request.connection_id,
        kunnr_f=request.kunnr_f,
        kunnr_t=request.kunnr_t,
        bukrs=request.bukrs,
        zaiko=request.zaiko,
        limit=request.limit,
        decrypted_passwd=decrypted_passwd,
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
    """キャッシュされたマテリアルデータを取得（旧エンドポイント）."""
    service = SapMaterialService(db)
    cache_list = service.get_cached_materials(connection_id, kunnr)

    return [SapMaterialCacheResponse.model_validate(item) for item in cache_list[:limit]]


@router.get("/cache", response_model=SapCacheListResponse)
async def get_sap_cache(
    db: Annotated[Session, Depends(get_db)],
    connection_id: int | None = Query(None, description="接続ID"),
    kunnr: str | None = Query(None, description="得意先コード"),
    zkdmat_b_search: str | None = Query(None, description="先方品番で検索（部分一致）"),
    page: int = Query(1, ge=1, description="ページ番号"),
    page_size: int = Query(50, ge=1, le=200, description="ページサイズ"),
) -> SapCacheListResponse:
    """SAPキャッシュデータ取得（ページング対応）."""
    from sqlalchemy import func, select

    from app.infrastructure.persistence.models.sap_models import SapMaterialCache

    stmt = select(SapMaterialCache)

    # フィルタ
    if connection_id:
        stmt = stmt.where(SapMaterialCache.connection_id == connection_id)
    if kunnr:
        stmt = stmt.where(SapMaterialCache.kunnr == kunnr)
    if zkdmat_b_search:
        stmt = stmt.where(SapMaterialCache.zkdmat_b.ilike(f"%{zkdmat_b_search}%"))

    # 総件数取得
    total_count = db.execute(select(func.count()).select_from(stmt.subquery())).scalar()

    # ページング
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size).order_by(SapMaterialCache.zkdmat_b)

    items = list(db.execute(stmt).scalars().all())

    # 選択カラムのみを抽出してレスポンス作成
    cache_items = []
    for item in items:
        raw_data = item.raw_data or {}
        cache_items.append(
            SapCacheItemResponse(
                connection_id=item.connection_id,
                zkdmat_b=item.zkdmat_b,
                kunnr=item.kunnr,
                zmkmat_b=raw_data.get("ZMKMAT_B"),
                meins=raw_data.get("MEINS"),
                zlifnr_h=raw_data.get("ZLIFNR_H"),
                zotwarh_h=raw_data.get("ZOTWARH_H"),
                zdepnm_s_h=raw_data.get("ZDEPNM_S_H"),
                zshipte_h=raw_data.get("ZSHIPTE_H"),
                fetched_at=item.fetched_at,
                fetch_batch_id=item.fetch_batch_id,
                raw_data=raw_data,
            )
        )

    total_pages = (total_count + page_size - 1) // page_size if total_count else 0

    return SapCacheListResponse(
        items=cache_items,
        total=total_count or 0,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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
